package com.example.registrationotp.model;

public enum Role {
	ADMIN,
	MANAGER,
	SHIPPER,
	STAFF,
	USER;

	public boolean requiresWorkingStore() {
		return this == MANAGER || this == SHIPPER || this == STAFF;
	}
}
