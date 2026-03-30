package com.example.registrationotp.handler;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.example.registrationotp.dto.ErrorResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ConflictException;
import com.example.registrationotp.exception.ForbiddenException;
import com.example.registrationotp.exception.InvalidOtpException;
import com.example.registrationotp.exception.NotFoundException;
import com.example.registrationotp.exception.OtpDeliveryException;
import com.example.registrationotp.exception.OtpExpiredException;
import com.example.registrationotp.exception.StorageException;
import com.example.registrationotp.exception.UnauthorizedException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleValidation(
			MethodArgumentNotValidException exception,
			HttpServletRequest request
	) {
		Map<String, String> validationErrors = exception.getBindingResult()
				.getFieldErrors()
				.stream()
				.collect(Collectors.toMap(
						FieldError::getField,
						FieldError::getDefaultMessage,
						(first, second) -> first,
						LinkedHashMap::new
				));

		return buildResponse(
				HttpStatus.BAD_REQUEST,
				"Validation failed",
				request,
				validationErrors
		);
	}

	@ExceptionHandler(ConflictException.class)
	public ResponseEntity<ErrorResponse> handleConflict(ConflictException exception, HttpServletRequest request) {
		return buildResponse(HttpStatus.CONFLICT, exception.getMessage(), request, Map.of());
	}

	@ExceptionHandler({InvalidOtpException.class, OtpExpiredException.class, BadRequestException.class})
	public ResponseEntity<ErrorResponse> handleBadRequest(RuntimeException exception, HttpServletRequest request) {
		return buildResponse(HttpStatus.BAD_REQUEST, exception.getMessage(), request, Map.of());
	}

	@ExceptionHandler(UnauthorizedException.class)
	public ResponseEntity<ErrorResponse> handleUnauthorized(
			UnauthorizedException exception,
			HttpServletRequest request
	) {
		return buildResponse(HttpStatus.UNAUTHORIZED, exception.getMessage(), request, Map.of());
	}

	@ExceptionHandler(ForbiddenException.class)
	public ResponseEntity<ErrorResponse> handleForbidden(
			ForbiddenException exception,
			HttpServletRequest request
	) {
		return buildResponse(HttpStatus.FORBIDDEN, exception.getMessage(), request, Map.of());
	}

	@ExceptionHandler(NotFoundException.class)
	public ResponseEntity<ErrorResponse> handleNotFound(
			NotFoundException exception,
			HttpServletRequest request
	) {
		return buildResponse(HttpStatus.NOT_FOUND, exception.getMessage(), request, Map.of());
	}

	@ExceptionHandler(NoResourceFoundException.class)
	public ResponseEntity<ErrorResponse> handleNoResourceFound(
			NoResourceFoundException exception,
			HttpServletRequest request
	) {
		return buildResponse(HttpStatus.NOT_FOUND, "Resource not found", request, Map.of());
	}

	@ExceptionHandler(OtpDeliveryException.class)
	public ResponseEntity<ErrorResponse> handleMail(OtpDeliveryException exception, HttpServletRequest request) {
		return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage(), request, Map.of());
	}

	@ExceptionHandler(StorageException.class)
	public ResponseEntity<ErrorResponse> handleStorage(StorageException exception, HttpServletRequest request) {
		return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage(), request, Map.of());
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ErrorResponse> handleDataIntegrity(
			DataIntegrityViolationException exception,
			HttpServletRequest request
	) {
		return buildResponse(HttpStatus.CONFLICT, "Data conflict occurred", request, Map.of());
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception, HttpServletRequest request) {
		return buildResponse(
				HttpStatus.INTERNAL_SERVER_ERROR,
				"Unexpected server error",
				request,
				Map.of()
		);
	}

	private ResponseEntity<ErrorResponse> buildResponse(
			HttpStatus status,
			String message,
			HttpServletRequest request,
			Map<String, String> validationErrors
	) {
		ErrorResponse errorResponse = new ErrorResponse(
				Instant.now(),
				status.value(),
				status.getReasonPhrase(),
				message,
				request.getRequestURI(),
				validationErrors
		);
		return ResponseEntity.status(status).body(errorResponse);
	}
}
