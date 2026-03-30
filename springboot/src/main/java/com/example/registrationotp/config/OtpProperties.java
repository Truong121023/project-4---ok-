package com.example.registrationotp.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.otp")
public class OtpProperties {

	@Min(4)
	@Max(8)
	private int length = 6;

	@Min(1)
	@Max(30)
	private int expMinutes = 5;

	public int getLength() {
		return length;
	}

	public void setLength(int length) {
		this.length = length;
	}

	public int getExpMinutes() {
		return expMinutes;
	}

	public void setExpMinutes(int expMinutes) {
		this.expMinutes = expMinutes;
	}
}
