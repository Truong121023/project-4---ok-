package com.example.registrationotp.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.example.registrationotp.config.MapboxSearchProperties;
import com.example.registrationotp.dto.PublicAddressResolveResponse;
import com.example.registrationotp.dto.PublicAddressSuggestionResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.NotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AddressLookupService {

	private static final String MAPBOX_GEOCODE_SOURCE = "mapbox_geocoding";

	private final MapboxSearchProperties mapboxSearchProperties;
	private final ObjectMapper objectMapper;
	private final RestClient restClient;

	public AddressLookupService(
			MapboxSearchProperties mapboxSearchProperties,
			ObjectMapper objectMapper,
			RestClient.Builder restClientBuilder
	) {
		this.mapboxSearchProperties = mapboxSearchProperties;
		this.objectMapper = objectMapper;
		this.restClient = restClientBuilder.baseUrl(mapboxSearchProperties.getBaseUrl()).build();
	}

	public List<PublicAddressSuggestionResponse> suggestAddresses(String input, String sessionToken, int limit) {
		validateConfiguration();
		String normalizedInput = normalizeLookupInput(input);
		if (normalizedInput.length() < 3) {
			throw new BadRequestException("Enter at least 3 characters to look up an address");
		}

		String normalizedSessionToken = StringUtils.hasText(sessionToken) ? sessionToken.trim() : "";
		int maxItems = Math.max(1, Math.min(limit, 10));
		JsonNode response = requestMapboxSuggestions(normalizedInput, maxItems);
		List<PublicAddressSuggestionResponse> suggestions = new ArrayList<>();

		for (JsonNode featureNode : response.path("features")) {
			JsonNode properties = featureNode.path("properties");
			String placeId = firstNonBlank(
					asTrimmedText(properties, "mapbox_id"),
					asTrimmedText(featureNode, "id")
			);
			if (!StringUtils.hasText(placeId)) {
				continue;
			}

			String label = firstNonBlank(
					asTrimmedText(properties, "full_address"),
					joinAddressParts(
							asTrimmedText(properties, "name"),
							asTrimmedText(properties, "place_formatted")
					),
					asTrimmedText(featureNode, "name")
			);
			if (!StringUtils.hasText(label)) {
				continue;
			}

			suggestions.add(new PublicAddressSuggestionResponse(
					placeId,
					label,
					firstNonBlank(
							asTrimmedText(properties, "place_formatted"),
							asTrimmedText(properties, "feature_type")
					),
					normalizedSessionToken,
					MAPBOX_GEOCODE_SOURCE,
					label,
					extractLatitude(featureNode, properties),
					extractLongitude(featureNode, properties)
			));
		}

		return suggestions;
	}

	public PublicAddressResolveResponse resolveAddress(String input, String placeId, String sessionToken) {
		validateConfiguration();
		String normalizedInput = normalizeLookupInput(input);
		String normalizedPlaceId = StringUtils.hasText(placeId) ? placeId.trim() : "";
		if (!StringUtils.hasText(normalizedPlaceId) && !StringUtils.hasText(normalizedInput)) {
			throw new BadRequestException("input or placeId is required");
		}

		return geocodeForward(
				StringUtils.hasText(normalizedPlaceId) ? normalizedPlaceId : normalizedInput,
				false,
				1
		);
	}

	private JsonNode requestMapboxSuggestions(String input, int limit) {
		try {
			return restClient.get()
					.uri(uriBuilder -> uriBuilder.path("/search/geocode/v6/forward")
							.queryParam("q", input)
							.queryParam("access_token", mapboxSearchProperties.getAccessToken())
							.queryParam("language", mapboxSearchProperties.getLanguage())
							.queryParam("country", mapboxSearchProperties.getCountry())
							.queryParam("types", mapboxSearchProperties.resolveSuggestTypesCsv())
							.queryParam("autocomplete", true)
							.queryParam("limit", limit)
							.queryParam("permanent", mapboxSearchProperties.isPermanent())
							.build())
					.retrieve()
					.body(JsonNode.class);
		} catch (RestClientResponseException exception) {
			throw mapMapboxError(exception);
		} catch (RestClientException exception) {
			throw new BadRequestException("Address lookup is temporarily unavailable");
		}
	}

	private PublicAddressResolveResponse geocodeForward(String query, boolean autocomplete, int limit) {
		try {
			JsonNode response = restClient.get()
					.uri(uriBuilder -> uriBuilder.path("/search/geocode/v6/forward")
							.queryParam("q", query)
							.queryParam("access_token", mapboxSearchProperties.getAccessToken())
							.queryParam("language", mapboxSearchProperties.getLanguage())
							.queryParam("country", mapboxSearchProperties.getCountry())
							.queryParam("types", mapboxSearchProperties.resolveGeocodeTypesCsv())
							.queryParam("autocomplete", autocomplete)
							.queryParam("limit", Math.max(1, Math.min(limit, 10)))
							.queryParam("permanent", mapboxSearchProperties.isPermanent())
							.build())
					.retrieve()
					.body(JsonNode.class);

			JsonNode firstFeature = response.path("features").isArray() && response.path("features").size() > 0
					? response.path("features").get(0)
					: null;
			if (firstFeature == null || firstFeature.isMissingNode() || firstFeature.isNull()) {
				throw new NotFoundException("No matching address was found");
			}

			JsonNode properties = firstFeature.path("properties");
			String formattedAddress = firstNonBlank(
					asTrimmedText(properties, "full_address"),
					joinAddressParts(
							asTrimmedText(properties, "name"),
							asTrimmedText(properties, "place_formatted")
					)
			);
			Double latitude = extractLatitude(firstFeature, properties);
			Double longitude = extractLongitude(firstFeature, properties);
			String resolvedPlaceId = firstNonBlank(
					asTrimmedText(properties, "mapbox_id"),
					asTrimmedText(firstFeature, "id")
			);

			if (!StringUtils.hasText(formattedAddress) || latitude == null || longitude == null) {
				throw new BadRequestException("Mapbox returned an invalid address response");
			}

			return new PublicAddressResolveResponse(
					resolvedPlaceId,
					formattedAddress,
					formattedAddress,
					latitude,
					longitude,
					MAPBOX_GEOCODE_SOURCE
			);
		} catch (RestClientResponseException exception) {
			throw mapMapboxError(exception);
		} catch (RestClientException exception) {
			throw new BadRequestException("Address lookup is temporarily unavailable");
		}
	}

	private void validateConfiguration() {
		if (!StringUtils.hasText(mapboxSearchProperties.getAccessToken())) {
			throw new BadRequestException("Mapbox access token is not configured");
		}
	}

	private RuntimeException mapMapboxError(RestClientResponseException exception) {
		String mapboxMessage = extractMapboxMessage(exception.getResponseBodyAsString());
		int statusCode = exception.getStatusCode().value();

		if (statusCode == 404) {
			return new NotFoundException(firstNonBlank(mapboxMessage, "Address was not found"));
		}
		if (statusCode == 401 || statusCode == 403) {
			return new BadRequestException(firstNonBlank(
					mapboxMessage,
					"Mapbox geocoding request was rejected. Check the access token and billing setup."
			));
		}
		if (statusCode == 429) {
			return new BadRequestException("Address lookup is temporarily busy. Please try again in a moment.");
		}
		if (statusCode >= 500) {
			return new BadRequestException("Address lookup is temporarily unavailable. Please try again.");
		}
		return new BadRequestException(firstNonBlank(mapboxMessage, "Address lookup request failed"));
	}

	private String extractMapboxMessage(String responseBody) {
		if (!StringUtils.hasText(responseBody)) {
			return null;
		}
		try {
			JsonNode root = objectMapper.readTree(responseBody);
			return firstNonBlank(
					asTrimmedText(root, "message"),
					asTrimmedText(root.path("error"), "message")
			);
		} catch (Exception exception) {
			return null;
		}
	}

	private String normalizeLookupInput(String input) {
		return StringUtils.hasText(input) ? input.trim() : "";
	}

	private String asTrimmedText(JsonNode node, String fieldName) {
		if (node == null || node.isMissingNode() || node.isNull()) {
			return "";
		}
		JsonNode fieldNode = node.path(fieldName);
		if (fieldNode.isMissingNode() || fieldNode.isNull()) {
			return "";
		}
		return fieldNode.asText("").trim();
	}

	private Double asNullableDouble(JsonNode node) {
		if (node == null || node.isMissingNode() || node.isNull()) {
			return null;
		}
		if (node.isNumber()) {
			return node.doubleValue();
		}
		String text = node.asText("").trim();
		if (!StringUtils.hasText(text)) {
			return null;
		}
		try {
			return Double.parseDouble(text);
		} catch (NumberFormatException exception) {
			return null;
		}
	}

	private Double extractLatitude(JsonNode featureNode, JsonNode propertiesNode) {
		Double latitude = asNullableDouble(propertiesNode.path("coordinates").path("latitude"));
		if (latitude != null) {
			return latitude;
		}
		JsonNode geometryCoordinates = featureNode.path("geometry").path("coordinates");
		if (geometryCoordinates.isArray() && geometryCoordinates.size() >= 2) {
			return asNullableDouble(geometryCoordinates.get(1));
		}
		return null;
	}

	private Double extractLongitude(JsonNode featureNode, JsonNode propertiesNode) {
		Double longitude = asNullableDouble(propertiesNode.path("coordinates").path("longitude"));
		if (longitude != null) {
			return longitude;
		}
		JsonNode geometryCoordinates = featureNode.path("geometry").path("coordinates");
		if (geometryCoordinates.isArray() && geometryCoordinates.size() >= 2) {
			return asNullableDouble(geometryCoordinates.get(0));
		}
		return null;
	}

	private String joinAddressParts(String first, String second) {
		if (StringUtils.hasText(first) && StringUtils.hasText(second)) {
			return first.trim() + ", " + second.trim();
		}
		if (StringUtils.hasText(first)) {
			return first.trim();
		}
		if (StringUtils.hasText(second)) {
			return second.trim();
		}
		return "";
	}

	private String firstNonBlank(String... values) {
		if (values == null) {
			return "";
		}
		for (String value : values) {
			if (StringUtils.hasText(value)) {
				return value.trim();
			}
		}
		return "";
	}
}
