package com.example.registrationotp.config;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

@ConfigurationProperties(prefix = "app.mapbox.search")
public class MapboxSearchProperties {

	private String baseUrl = "https://api.mapbox.com";
	private String accessToken;
	private String language = "en";
	private String country = "VN";
	private boolean permanent = false;
	private List<String> suggestTypes = new ArrayList<>(List.of(
			"address",
			"street",
			"neighborhood",
			"locality",
			"place",
			"district",
			"postcode",
			"region"
	));
	private List<String> geocodeTypes = new ArrayList<>(List.of(
			"address",
			"street",
			"neighborhood",
			"locality",
			"place",
			"district",
			"postcode",
			"region"
	));

	public String getBaseUrl() {
		return baseUrl;
	}

	public void setBaseUrl(String baseUrl) {
		this.baseUrl = StringUtils.hasText(baseUrl) ? baseUrl.trim() : "https://api.mapbox.com";
	}

	public String getAccessToken() {
		return accessToken;
	}

	public void setAccessToken(String accessToken) {
		this.accessToken = StringUtils.hasText(accessToken) ? accessToken.trim() : null;
	}

	public String getLanguage() {
		return language;
	}

	public void setLanguage(String language) {
		this.language = StringUtils.hasText(language) ? language.trim() : "en";
	}

	public String getCountry() {
		return country;
	}

	public void setCountry(String country) {
		this.country = StringUtils.hasText(country) ? country.trim().toUpperCase(Locale.ROOT) : "VN";
	}

	public boolean isPermanent() {
		return permanent;
	}

	public void setPermanent(boolean permanent) {
		this.permanent = permanent;
	}

	public List<String> getSuggestTypes() {
		return suggestTypes;
	}

	public void setSuggestTypes(List<String> suggestTypes) {
		this.suggestTypes = suggestTypes != null ? new ArrayList<>(suggestTypes) : new ArrayList<>();
	}

	public List<String> getGeocodeTypes() {
		return geocodeTypes;
	}

	public void setGeocodeTypes(List<String> geocodeTypes) {
		this.geocodeTypes = geocodeTypes != null ? new ArrayList<>(geocodeTypes) : new ArrayList<>();
	}

	public String resolveSuggestTypesCsv() {
		return resolveTypesCsv(suggestTypes, "address,street,neighborhood,locality,place,district,postcode,region");
	}

	public String resolveGeocodeTypesCsv() {
		return resolveTypesCsv(geocodeTypes, "address,street,neighborhood,locality,place,district,postcode,region");
	}

	private String resolveTypesCsv(List<String> values, String fallback) {
		LinkedHashSet<String> resolved = new LinkedHashSet<>();
		for (String value : values) {
			if (StringUtils.hasText(value)) {
				resolved.add(value.trim().toLowerCase(Locale.ROOT));
			}
		}
		if (resolved.isEmpty()) {
			return fallback;
		}
		return String.join(",", resolved);
	}
}
