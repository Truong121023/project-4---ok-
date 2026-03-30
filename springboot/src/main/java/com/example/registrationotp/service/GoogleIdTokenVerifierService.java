package com.example.registrationotp.service;

import java.util.List;
import java.util.Set;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.example.registrationotp.config.GoogleLoginProperties;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.UnauthorizedException;
import com.example.registrationotp.support.EmailNormalizer;

@Service
public class GoogleIdTokenVerifierService {

	private static final String GOOGLE_JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";
	private static final Set<String> ALLOWED_ISSUERS = Set.of(
			"https://accounts.google.com",
			"accounts.google.com"
	);

	private final GoogleLoginProperties googleLoginProperties;
	private final JwtDecoder jwtDecoder;

	public GoogleIdTokenVerifierService(GoogleLoginProperties googleLoginProperties) {
		this.googleLoginProperties = googleLoginProperties;
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWK_SET_URI).build();
		decoder.setJwtValidator(new JwtTimestampValidator());
		this.jwtDecoder = decoder;
	}

	public GoogleAccount verify(String idToken) {
		Set<String> allowedClientIds = googleLoginProperties.resolveAllowedClientIds();
		if (allowedClientIds.isEmpty()) {
			throw new BadRequestException("Google login is not configured");
		}

		Jwt jwt;
		try {
			jwt = jwtDecoder.decode(idToken.trim());
		} catch (JwtException exception) {
			throw new UnauthorizedException("Google ID token is invalid");
		}

		String issuer = jwt.getIssuer() != null ? jwt.getIssuer().toString() : null;
		if (!StringUtils.hasText(issuer) || !ALLOWED_ISSUERS.contains(issuer)) {
			throw new UnauthorizedException("Google ID token issuer is invalid");
		}

		List<String> audience = jwt.getAudience();
		String authorizedParty = jwt.getClaimAsString("azp");
		boolean matchesAudience = audience != null && audience.stream().anyMatch(allowedClientIds::contains);
		boolean matchesAuthorizedParty = StringUtils.hasText(authorizedParty)
				&& allowedClientIds.contains(authorizedParty.trim());
		if (!matchesAudience && !matchesAuthorizedParty) {
			throw new UnauthorizedException("Google ID token audience is invalid");
		}

		if (!isEmailVerified(jwt.getClaim("email_verified"))) {
			throw new BadRequestException("Google account email is not verified");
		}

		String email = EmailNormalizer.normalize(jwt.getClaimAsString("email"));
		if (!StringUtils.hasText(email)) {
			throw new UnauthorizedException("Google account email is missing");
		}

		String fullName = normalizeName(jwt.getClaimAsString("name"), email);
		return new GoogleAccount(email, fullName);
	}

	private boolean isEmailVerified(Object claimValue) {
		if (claimValue instanceof Boolean booleanValue) {
			return booleanValue;
		}
		if (claimValue instanceof String stringValue) {
			return Boolean.parseBoolean(stringValue);
		}
		return false;
	}

	private String normalizeName(String fullName, String email) {
		if (StringUtils.hasText(fullName)) {
			return fullName.trim();
		}
		int atIndex = email.indexOf('@');
		return atIndex > 0 ? email.substring(0, atIndex) : email;
	}

	public record GoogleAccount(
			String email,
			String fullName
	) {
	}
}
