package com.example.registrationotp.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.mobile")
public class AppMobileProperties {

	private String orderQrDeepLinkBase = "kamatcha://order-qr/";
	private String publicBaseUrl;
	private String androidPackageName;
	private List<String> assetLinkSha256Fingerprints = new ArrayList<>();

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

	public String getAndroidPackageName() {
		return androidPackageName;
	}

	public void setAndroidPackageName(String androidPackageName) {
		this.androidPackageName = androidPackageName;
	}

	public List<String> getAssetLinkSha256Fingerprints() {
		return assetLinkSha256Fingerprints;
	}

	public void setAssetLinkSha256Fingerprints(List<String> assetLinkSha256Fingerprints) {
		this.assetLinkSha256Fingerprints = assetLinkSha256Fingerprints == null
				? new ArrayList<>()
				: new ArrayList<>(assetLinkSha256Fingerprints);
	}
}
