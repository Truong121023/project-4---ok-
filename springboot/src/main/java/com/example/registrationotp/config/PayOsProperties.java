package com.example.registrationotp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.payos")
public class PayOsProperties {

	private boolean enabled = true;

	private String baseUrl = "https://api-merchant.payos.vn";

	private String clientId;

	private String apiKey;

	private String checksumKey;

	private String partnerCode;

	private Integer paymentExpiryMinutes = 15;

	public boolean isEnabled() {
		return enabled;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
	}

	public String getBaseUrl() {
		return baseUrl;
	}

	public void setBaseUrl(String baseUrl) {
		this.baseUrl = baseUrl;
	}

	public String getClientId() {
		return clientId;
	}

	public void setClientId(String clientId) {
		this.clientId = clientId;
	}

	public String getApiKey() {
		return apiKey;
	}

	public void setApiKey(String apiKey) {
		this.apiKey = apiKey;
	}

	public String getChecksumKey() {
		return checksumKey;
	}

	public void setChecksumKey(String checksumKey) {
		this.checksumKey = checksumKey;
	}

	public String getPartnerCode() {
		return partnerCode;
	}

	public void setPartnerCode(String partnerCode) {
		this.partnerCode = partnerCode;
	}

	public Integer getPaymentExpiryMinutes() {
		return paymentExpiryMinutes;
	}

	public void setPaymentExpiryMinutes(Integer paymentExpiryMinutes) {
		this.paymentExpiryMinutes = paymentExpiryMinutes;
	}
}
