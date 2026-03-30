package com.example.registrationotp.service;

import com.example.registrationotp.dto.PayOsCreatePaymentLinkRequest;
import com.example.registrationotp.dto.PayOsPaymentLinkData;
import com.example.registrationotp.dto.PayOsPaymentStatusResponse;

public interface PayOsClient {

	PayOsPaymentLinkData createPaymentLink(PayOsCreatePaymentLinkRequest request);

	PayOsPaymentStatusResponse getPaymentStatus(Long orderCode);
}
