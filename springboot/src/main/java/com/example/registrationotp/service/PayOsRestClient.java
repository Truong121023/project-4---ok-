package com.example.registrationotp.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.example.registrationotp.config.PayOsProperties;
import com.example.registrationotp.dto.PayOsCreatePaymentLinkRequest;
import com.example.registrationotp.dto.PayOsPaymentLinkData;
import com.example.registrationotp.dto.PayOsPaymentStatusResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.ConflictException;

@Service
public class PayOsRestClient implements PayOsClient {

	private final PayOsProperties payOsProperties;
	private final PayOsSignatureService payOsSignatureService;
	private final RestClient restClient;

	public PayOsRestClient(
			PayOsProperties payOsProperties,
			PayOsSignatureService payOsSignatureService,
			RestClient.Builder restClientBuilder
	) {
		this.payOsProperties = payOsProperties;
		this.payOsSignatureService = payOsSignatureService;
		this.restClient = restClientBuilder.baseUrl(payOsProperties.getBaseUrl()).build();
	}

	@Override
	public PayOsPaymentLinkData createPaymentLink(PayOsCreatePaymentLinkRequest request) {
		validateConfiguration();
		Map<String, Object> requestBody = new LinkedHashMap<>();
		requestBody.put("orderCode", request.orderCode());
		requestBody.put("amount", request.amount());
		requestBody.put("description", request.description());
		requestBody.put("buyerName", request.buyerName());
		requestBody.put("buyerEmail", request.buyerEmail());
		requestBody.put("buyerPhone", request.buyerPhone());
		requestBody.put("buyerAddress", request.buyerAddress());
		requestBody.put("items", request.items().stream()
				.map(item -> Map.of(
						"name", item.name(),
						"quantity", item.quantity(),
						"price", item.price(),
						"unit", item.unit()
				))
				.toList());
		requestBody.put("cancelUrl", request.cancelUrl());
		requestBody.put("returnUrl", request.returnUrl());
		requestBody.put("expiredAt", request.expiredAt());
		requestBody.put("signature", payOsSignatureService.createPaymentRequestSignature(request));

		Map<String, Object> response = post("/v2/payment-requests", requestBody);
		Map<String, Object> data = getMap(response, "data");
		return new PayOsPaymentLinkData(
				asString(data.get("paymentLinkId")),
				asString(data.get("checkoutUrl")),
				asString(data.get("qrCode")),
				asString(data.get("status")),
				asLong(data.get("orderCode")),
				asInteger(data.get("amount"))
		);
	}

	@Override
	public PayOsPaymentStatusResponse getPaymentStatus(Long orderCode) {
		validateConfiguration();
		Map<String, Object> response = get("/v2/payment-requests/" + orderCode);
		Map<String, Object> data = getMap(response, "data");
		return new PayOsPaymentStatusResponse(
				asString(data.get("id")),
				asLong(data.get("orderCode")),
				asInteger(data.get("amount")),
				asInteger(data.get("amountPaid")),
				asInteger(data.get("amountRemaining")),
				asString(data.get("status"))
		);
	}

	private Map<String, Object> post(String uri, Map<String, Object> body) {
		try {
			return restClient.post()
					.uri(uri)
					.headers(this::applyHeaders)
					.contentType(MediaType.APPLICATION_JSON)
					.body(body)
					.retrieve()
					.body(new ParameterizedTypeReference<>() {
					});
		} catch (RestClientResponseException exception) {
			throw mapError(exception);
		} catch (RestClientException exception) {
			throw new BadRequestException("payOS request failed");
		}
	}

	private Map<String, Object> get(String uri) {
		try {
			return restClient.get()
					.uri(uri)
					.headers(this::applyHeaders)
					.retrieve()
					.body(new ParameterizedTypeReference<>() {
					});
		} catch (RestClientResponseException exception) {
			throw mapError(exception);
		} catch (RestClientException exception) {
			throw new BadRequestException("payOS request failed");
		}
	}

	private void applyHeaders(HttpHeaders headers) {
		headers.set("x-client-id", payOsProperties.getClientId());
		headers.set("x-api-key", payOsProperties.getApiKey());
		if (StringUtils.hasText(payOsProperties.getPartnerCode())) {
			headers.set("x-partner-code", payOsProperties.getPartnerCode());
		}
	}

	private void validateConfiguration() {
		if (!payOsProperties.isEnabled()) {
			throw new BadRequestException("payOS is disabled");
		}
		if (!StringUtils.hasText(payOsProperties.getClientId())
				|| !StringUtils.hasText(payOsProperties.getApiKey())
				|| !StringUtils.hasText(payOsProperties.getChecksumKey())) {
			throw new BadRequestException("payOS is not configured");
		}
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> getMap(Map<String, Object> root, String key) {
		Object value = root == null ? null : root.get(key);
		if (value instanceof Map<?, ?> map) {
			return (Map<String, Object>) map;
		}
		throw new BadRequestException("payOS returned invalid response");
	}

	private RuntimeException mapError(RestClientResponseException exception) {
		if (exception.getStatusCode().value() == 409) {
			return new ConflictException("payOS payment request already exists");
		}
		return new BadRequestException("payOS request failed: HTTP " + exception.getStatusCode().value());
	}

	private String asString(Object value) {
		return value == null ? null : String.valueOf(value);
	}

	private Long asLong(Object value) {
		if (value instanceof Number number) {
			return number.longValue();
		}
		if (value == null) {
			return null;
		}
		return Long.parseLong(String.valueOf(value));
	}

	private Integer asInteger(Object value) {
		if (value instanceof Number number) {
			return number.intValue();
		}
		if (value == null) {
			return null;
		}
		return Integer.parseInt(String.valueOf(value));
	}
}
