package com.example.registrationotp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.mobile")
public class AppMobileProperties {

	private String orderQrDeepLinkBase = "teamatcha://order-qr/";
	private String publicBaseUrl;

	public String getOrderQrDeepLinkBase() {
		return orderQrDeepLinkBase;
	}

	public void setOrderQrDeepLinkBase(String orderQrDeepLinkBase) {
		this.orderQrDeepLinkBase = orderQrDeepLinkBase;
	}

	public String getPublicBaseUrl() {
		return publicBaseUrl;
	}

	public void setPublicBaseUrl(String publicBaseUrl) {
		this.publicBaseUrl = publicBaseUrl;
	}
}
