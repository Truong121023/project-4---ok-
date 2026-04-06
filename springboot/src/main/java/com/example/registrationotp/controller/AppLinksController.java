package com.example.registrationotp.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.registrationotp.config.AppMobileProperties;

@RestController
@RequestMapping("/.well-known")
public class AppLinksController {

	private static final List<String> DEFAULT_RELATIONS = List.of(
			"delegate_permission/common.handle_all_urls"
	);

	private final AppMobileProperties appMobileProperties;

	public AppLinksController(AppMobileProperties appMobileProperties) {
		this.appMobileProperties = appMobileProperties;
	}

	@GetMapping(value = "/assetlinks.json", produces = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<List<Map<String, Object>>> assetLinks() {
		List<String> fingerprints = appMobileProperties.getAssetLinkSha256Fingerprints().stream()
				.filter(StringUtils::hasText)
				.map(String::trim)
				.toList();
		if (!StringUtils.hasText(appMobileProperties.getAndroidPackageName())
				|| fingerprints.isEmpty()) {
			return ResponseEntity.ok(List.of());
		}

		return ResponseEntity.ok(List.of(
				Map.of(
						"relation", DEFAULT_RELATIONS,
						"target", Map.of(
								"namespace", "android_app",
								"package_name", appMobileProperties.getAndroidPackageName().trim(),
								"sha256_cert_fingerprints", fingerprints
						)
				)
		));
	}
}
