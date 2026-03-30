package com.example.registrationotp.service;

import java.security.SecureRandom;

import org.springframework.stereotype.Component;

@Component
public class OtpGenerator {

	private final SecureRandom secureRandom = new SecureRandom();

	public String generate(int length) {
		StringBuilder builder = new StringBuilder(length);
		for (int index = 0; index < length; index++) {
			builder.append(secureRandom.nextInt(10));
		}
		return builder.toString();
	}
}
