package com.example.registrationotp.model;

public enum Role {
	ADMIN,
	MANAGER,
	STAFF,
	SHIPPER,
	USER;

	public boolean requiresWorkingStore() {
		return this == MANAGER || this == STAFF || this == SHIPPER;
	}
}
