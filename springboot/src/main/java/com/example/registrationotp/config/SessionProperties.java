package com.example.registrationotp.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.session")
public class SessionProperties {

	@Min(1)
	@Max(30)
	private int expDays = 7;

	public int getExpDays() {
		return expDays;
	}

	public void setExpDays(int expDays) {
		this.expDays = expDays;
	}
}
