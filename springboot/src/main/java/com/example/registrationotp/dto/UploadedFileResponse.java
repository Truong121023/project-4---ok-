package com.example.registrationotp.dto;

public record UploadedFileResponse(
		String originalName,
		String storedName,
		String path,
		String contentType,
		long size
) {
}
