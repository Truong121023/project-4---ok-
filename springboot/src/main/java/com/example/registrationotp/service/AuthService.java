package com.example.registrationotp.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.registrationotp.config.OtpProperties;
import com.example.registrationotp.config.SessionProperties;
import com.example.registrationotp.dto.GoogleCompleteProfileRequest;
import com.example.registrationotp.dto.GoogleCompleteProfileResponse;
import com.example.registrationotp.dto.GoogleLoginRequest;
import com.example.registrationotp.dto.LoginRequest;
import com.example.registrationotp.dto.LoginResponse;
import com.example.registrationotp.dto.LogoutResponse;
import com.example.registrationotp.dto.MeResponse;
import com.example.registrationotp.dto.MessageResponse;
import com.example.registrationotp.dto.PasswordResetConfirmRequest;
import com.example.registrationotp.dto.PasswordResetOtpRequest;
import com.example.registrationotp.dto.PasswordResetOtpResponse;
import com.example.registrationotp.dto.RegisterRequest;
import com.example.registrationotp.dto.RegisterResponse;
import com.example.registrationotp.dto.UserResponse;
import com.example.registrationotp.dto.VerifyOtpRequest;
import com.example.registrationotp.dto.VerifyOtpResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ConflictException;
import com.example.registrationotp.exception.InvalidOtpException;
import com.example.registrationotp.exception.OtpDeliveryException;
import com.example.registrationotp.exception.OtpExpiredException;
import com.example.registrationotp.exception.UnauthorizedException;
import com.example.registrationotp.model.EmailOtp;
import com.example.registrationotp.model.OtpPurpose;
import com.example.registrationotp.model.Role;
import com.example.registrationotp.model.User;
import com.example.registrationotp.model.UserSession;
import com.example.registrationotp.repository.EmailOtpRepository;
import com.example.registrationotp.repository.UserRepository;
import com.example.registrationotp.repository.UserSessionRepository;
import com.example.registrationotp.support.EmailNormalizer;

@Service
public class AuthService {

	private static final String GOOGLE_PENDING_PASSWORD_HASH = "{google-pending}";

	private final UserRepository userRepository;
	private final EmailOtpRepository emailOtpRepository;
	private final UserSessionRepository userSessionRepository;
	private final PasswordEncoder passwordEncoder;
	private final EmailSender emailSender;
	private final OtpGenerator otpGenerator;
	private final OtpProperties otpProperties;
	private final SessionProperties sessionProperties;
	private final TokenGenerator tokenGenerator;
	private final SessionAuthService sessionAuthService;
	private final GoogleIdTokenVerifierService googleIdTokenVerifierService;
	private final UserLevelService userLevelService;

	public AuthService(
			UserRepository userRepository,
			EmailOtpRepository emailOtpRepository,
			UserSessionRepository userSessionRepository,
			PasswordEncoder passwordEncoder,
			EmailSender emailSender,
			OtpGenerator otpGenerator,
			OtpProperties otpProperties,
			SessionProperties sessionProperties,
			TokenGenerator tokenGenerator,
			SessionAuthService sessionAuthService,
			GoogleIdTokenVerifierService googleIdTokenVerifierService,
			UserLevelService userLevelService
	) {
		this.userRepository = userRepository;
		this.emailOtpRepository = emailOtpRepository;
		this.userSessionRepository = userSessionRepository;
		this.passwordEncoder = passwordEncoder;
		this.emailSender = emailSender;
		this.otpGenerator = otpGenerator;
		this.otpProperties = otpProperties;
		this.sessionProperties = sessionProperties;
		this.tokenGenerator = tokenGenerator;
		this.sessionAuthService = sessionAuthService;
		this.googleIdTokenVerifierService = googleIdTokenVerifierService;
		this.userLevelService = userLevelService;
	}

	@Transactional
	public RegisterResponse register(RegisterRequest request) {
		String normalizedEmail = EmailNormalizer.normalize(request.email());
		User user = userRepository.findByEmail(normalizedEmail)
				.map(existingUser -> {
					if (existingUser.isEnabled()) {
						throw new ConflictException("Email is already registered");
					}
					return updatePendingUser(existingUser, request);
				})
				.orElseGet(() -> buildNewUser(request, normalizedEmail));

		User savedUser = userRepository.save(user);
		Instant expiresAt = issueOtp(savedUser, OtpPurpose.REGISTER_VERIFY);

		return new RegisterResponse(
				"Register successful. Please check your email to verify OTP.",
				savedUser.getId(),
				savedUser.getEmail(),
				savedUser.getRole(),
				expiresAt
		);
	}

	@Transactional
	public VerifyOtpResponse verifyOtp(VerifyOtpRequest request) {
		String normalizedEmail = EmailNormalizer.normalize(request.email());
		User user = userRepository.findByEmail(normalizedEmail)
				.orElseThrow(() -> new InvalidOtpException("Email is not registered"));

		if (user.isEnabled()) {
			throw new ConflictException("Email is already verified");
		}

		EmailOtp emailOtp = requireOtp(
				user.getId(),
				OtpPurpose.REGISTER_VERIFY,
				"OTP not found"
		);
		validateOtp(
				emailOtp,
				request.otp().trim(),
				"OTP has expired. Please register again to receive a new OTP.",
				user.getId(),
				OtpPurpose.REGISTER_VERIFY
		);

		Instant now = Instant.now();
		user.setEnabled(true);
		user.setVerifiedAt(now);
		userRepository.save(user);
		clearOtps(user.getId(), OtpPurpose.REGISTER_VERIFY);

		return new VerifyOtpResponse(
				"OTP verified successfully",
				toUserResponse(user)
		);
	}

	@Transactional
	public PasswordResetOtpResponse requestPasswordResetOtp(PasswordResetOtpRequest request) {
		String normalizedEmail = EmailNormalizer.normalize(request.email());
		User user = userRepository.findByEmail(normalizedEmail)
				.orElseThrow(() -> new BadRequestException("Email is not registered"));
		if (!user.isEnabled()) {
			throw new BadRequestException("Email is not verified. Please verify OTP before resetting password.");
		}

		Instant expiresAt = issueOtp(user, OtpPurpose.PASSWORD_RESET);
		return new PasswordResetOtpResponse(
				"Password reset OTP sent successfully. Please check your email.",
				user.getEmail(),
				expiresAt
		);
	}

	@Transactional
	public MessageResponse resetPasswordWithOtp(PasswordResetConfirmRequest request) {
		String normalizedEmail = EmailNormalizer.normalize(request.email());
		User user = userRepository.findByEmail(normalizedEmail)
				.orElseThrow(() -> new InvalidOtpException("Email is not registered"));
		if (!user.isEnabled()) {
			throw new BadRequestException("Email is not verified. Please verify OTP before resetting password.");
		}

		EmailOtp emailOtp = requireOtp(
				user.getId(),
				OtpPurpose.PASSWORD_RESET,
				"Password reset OTP not found"
		);
		validateOtp(
				emailOtp,
				request.otp().trim(),
				"OTP has expired. Please request a new password reset OTP.",
				user.getId(),
				OtpPurpose.PASSWORD_RESET
		);

		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		userRepository.save(user);
		userSessionRepository.deleteAllByUserId(user.getId());
		clearOtps(user.getId(), OtpPurpose.PASSWORD_RESET);
		return new MessageResponse("Password reset successful");
	}

	@Transactional
	public LoginResponse login(LoginRequest request) {
		String normalizedEmail = EmailNormalizer.normalize(request.email());
		User user = userRepository.findByEmail(normalizedEmail)
				.orElseThrow(() -> new UnauthorizedException("Email or password is incorrect"));

		if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new UnauthorizedException("Email or password is incorrect");
		}

		if (!user.isEnabled()) {
			throw new BadRequestException("Email is not verified. Please verify OTP before login.");
		}

		return createLoginResponse(user, "Login successful");
	}

	@Transactional
	public LoginResponse loginWithGoogle(GoogleLoginRequest request) {
		GoogleIdTokenVerifierService.GoogleAccount googleAccount = googleIdTokenVerifierService.verify(request.idToken());
		User user = userRepository.findByEmail(googleAccount.email())
				.orElseGet(() -> createGoogleUser(googleAccount));

		if (!user.isEnabled()) {
			throw new BadRequestException("Email is not verified. Please verify OTP before login.");
		}

		String message = user.isProfileCompleted()
				? "Google login successful"
				: "Google login successful. Please complete your profile.";
		return createLoginResponse(user, message);
	}

	@Transactional
	public GoogleCompleteProfileResponse completeGoogleProfile(
			String authorizationHeader,
			GoogleCompleteProfileRequest request
	) {
		User user = sessionAuthService.requireUser(authorizationHeader);
		if (user.isProfileCompleted()) {
			throw new ConflictException("Profile is already completed");
		}

		user.setFullName(request.fullName().trim());
		user.setPasswordHash(passwordEncoder.encode(request.password()));
		user.setProfileCompleted(true);
		User savedUser = userRepository.save(user);
		return new GoogleCompleteProfileResponse(
				"Google profile completed successfully",
				toUserResponse(savedUser)
		);
	}

	@Transactional(readOnly = true)
	public MeResponse me(String authorizationHeader) {
		UserSession session = sessionAuthService.requireSession(authorizationHeader);
		return new MeResponse(
				"Token is valid",
				session.getExpiresAt(),
				toUserResponse(session.getUser())
		);
	}

	@Transactional
	public LogoutResponse logout(String authorizationHeader) {
		UserSession session = sessionAuthService.requireSession(authorizationHeader);
		userSessionRepository.delete(session);
		return new LogoutResponse("Logout successful");
	}

	private Instant issueOtp(User user, OtpPurpose purpose) {
		clearOtps(user.getId(), purpose);
		Duration expiresIn = Duration.ofMinutes(otpProperties.getExpMinutes());
		Instant expiresAt = Instant.now().plus(expiresIn);
		String otpCode = otpGenerator.generate(otpProperties.getLength());

		EmailOtp emailOtp = new EmailOtp();
		emailOtp.setUser(user);
		emailOtp.setOtpCode(otpCode);
		emailOtp.setPurpose(purpose);
		emailOtp.setExpiresAt(expiresAt);
		emailOtp.setUsed(false);
		emailOtp.setUsedAt(null);
		emailOtpRepository.save(emailOtp);

		sendOtpEmail(user, otpCode, expiresIn, purpose);
		return expiresAt;
	}

	private void sendOtpEmail(User user, String otpCode, Duration expiresIn, OtpPurpose purpose) {
		try {
			if (purpose == OtpPurpose.PASSWORD_RESET) {
				emailSender.sendPasswordResetOtpEmail(
						user.getEmail(),
						user.getFullName(),
						otpCode,
						expiresIn
				);
				return;
			}
			emailSender.sendOtpEmail(
					user.getEmail(),
					user.getFullName(),
					otpCode,
					expiresIn
			);
		} catch (MailException | IllegalStateException exception) {
			throw new OtpDeliveryException("Cannot send OTP email. Please check mail configuration.", exception);
		}
	}

	private EmailOtp requireOtp(Long userId, OtpPurpose purpose, String missingMessage) {
		return findOtp(userId, purpose)
				.orElseThrow(() -> new InvalidOtpException(missingMessage));
	}

	private Optional<EmailOtp> findOtp(Long userId, OtpPurpose purpose) {
		Optional<EmailOtp> purposeSpecificOtp = emailOtpRepository
				.findTopByUserIdAndPurposeAndUsedFalseOrderByCreatedAtDesc(userId, purpose);
		if (purposeSpecificOtp.isPresent()) {
			return purposeSpecificOtp;
		}
		if (purpose == OtpPurpose.REGISTER_VERIFY) {
			return emailOtpRepository.findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(userId)
					.filter(emailOtp -> emailOtp.getPurpose() == OtpPurpose.REGISTER_VERIFY);
		}
		return Optional.empty();
	}

	private void validateOtp(
			EmailOtp emailOtp,
			String submittedOtp,
			String expiredMessage,
			Long userId,
			OtpPurpose purpose
	) {
		Instant now = Instant.now();
		if (emailOtp.getExpiresAt().isBefore(now)) {
			clearOtps(userId, purpose);
			throw new OtpExpiredException(expiredMessage);
		}
		if (!emailOtp.getOtpCode().equals(submittedOtp)) {
			throw new InvalidOtpException("OTP is invalid");
		}
		emailOtp.setUsed(true);
		emailOtp.setUsedAt(now);
		emailOtpRepository.save(emailOtp);
	}

	private void clearOtps(Long userId, OtpPurpose purpose) {
		if (purpose == OtpPurpose.REGISTER_VERIFY) {
			emailOtpRepository.deleteAllByUserId(userId);
			return;
		}
		emailOtpRepository.deleteAllByUserIdAndPurpose(userId, purpose);
	}

	private User buildNewUser(RegisterRequest request, String normalizedEmail) {
		User user = new User();
		user.setFullName(request.fullName().trim());
		user.setEmail(normalizedEmail);
		user.setPasswordHash(passwordEncoder.encode(request.password()));
		user.setEnabled(false);
		user.setRole(Role.USER);
		user.setWorkingStore(null);
		user.setVerifiedAt(null);
		user.setProfileCompleted(true);
		return user;
	}

	private User updatePendingUser(User existingUser, RegisterRequest request) {
		existingUser.setFullName(request.fullName().trim());
		existingUser.setPasswordHash(passwordEncoder.encode(request.password()));
		existingUser.setEnabled(false);
		existingUser.setRole(Role.USER);
		existingUser.setWorkingStore(null);
		existingUser.setVerifiedAt(null);
		existingUser.setProfileCompleted(true);
		return existingUser;
	}

	private User createGoogleUser(GoogleIdTokenVerifierService.GoogleAccount googleAccount) {
		User user = new User();
		user.setFullName(googleAccount.fullName());
		user.setEmail(googleAccount.email());
		user.setPasswordHash(GOOGLE_PENDING_PASSWORD_HASH);
		user.setEnabled(true);
		user.setRole(Role.USER);
		user.setWorkingStore(null);
		user.setVerifiedAt(Instant.now());
		user.setProfileCompleted(false);
		return userRepository.save(user);
	}

	private LoginResponse createLoginResponse(User user, String message) {
		userSessionRepository.deleteAllByUserId(user.getId());

		Instant expiresAt = Instant.now().plus(Duration.ofDays(sessionProperties.getExpDays()));
		String accessToken = tokenGenerator.generate();

		UserSession session = new UserSession();
		session.setUser(user);
		session.setToken(accessToken);
		session.setExpiresAt(expiresAt);
		userSessionRepository.save(session);

		return new LoginResponse(
				message,
				"Bearer",
				accessToken,
				expiresAt,
				toUserResponse(user)
		);
	}

	private UserResponse toUserResponse(User user) {
		return UserResponse.from(user, userLevelService.resolveMembershipPoints(user));
	}
}
