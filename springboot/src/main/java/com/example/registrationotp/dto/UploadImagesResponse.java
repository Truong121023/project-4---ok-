package com.example.registrationotp.dto;

import java.util.List;

public record UploadImagesResponse(
		String message,
		List<String> paths,
		List<UploadedFileResponse> files
) {
}
