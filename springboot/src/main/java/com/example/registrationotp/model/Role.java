package com.example.registrationotp.model;

public enum Role {
	ADMIN,
	MANAGER,
	SHIPPER,
	USER;

	public boolean requiresWorkingStore() {
		return this == MANAGER || this == SHIPPER;
	}
}
