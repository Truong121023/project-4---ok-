package com.example.registrationotp.config;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.util.StringUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.google")
public class GoogleLoginProperties {

	private String clientId;
	private List<String> allowedClientIds = new ArrayList<>();

	public String getClientId() {
		return clientId;
	}

	public void setClientId(String clientId) {
		this.clientId = clientId;
	}

	public List<String> getAllowedClientIds() {
		return allowedClientIds;
	}

	public void setAllowedClientIds(List<String> allowedClientIds) {
		this.allowedClientIds = allowedClientIds != null ? new ArrayList<>(allowedClientIds) : new ArrayList<>();
	}

	public Set<String> resolveAllowedClientIds() {
		Set<String> resolved = new LinkedHashSet<>();
		if (StringUtils.hasText(clientId)) {
			resolved.add(clientId.trim());
		}
		for (String allowedClientId : allowedClientIds) {
			if (StringUtils.hasText(allowedClientId)) {
				resolved.add(allowedClientId.trim());
			}
		}
		return Set.copyOf(resolved);
	}
}
