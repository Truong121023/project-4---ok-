package com.example.registrationotp.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.example.registrationotp.config.UploadProperties;
import com.example.registrationotp.dto.UploadImagesResponse;
import com.example.registrationotp.dto.UploadedFileResponse;
import com.example.registrationotp.exception.BadRequestException;
import com.example.registrationotp.exception.StorageException;

@Service
public class FileStorageService {

	private static final List<String> ALLOWED_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".gif", ".webp");

	private final Path uploadRoot;

	public FileStorageService(UploadProperties uploadProperties) {
		this.uploadRoot = Path.of(uploadProperties.getDir()).toAbsolutePath().normalize();
		try {
			Files.createDirectories(this.uploadRoot);
		} catch (IOException exception) {
			throw new StorageException("Unable to initialize upload directory", exception);
		}
	}

	public UploadImagesResponse storeImages(List<MultipartFile> files, String folder) {
		if (files == null || files.isEmpty()) {
			throw new BadRequestException("At least one image file is required");
		}

		String sanitizedFolder = sanitizeFolder(folder);
		Path targetDirectory = uploadRoot.resolve(sanitizedFolder);

		try {
			Files.createDirectories(targetDirectory);
		} catch (IOException exception) {
			throw new StorageException("Unable to create upload directory", exception);
		}

		List<UploadedFileResponse> uploadedFiles = files.stream()
				.map(file -> storeSingleFile(file, sanitizedFolder, targetDirectory))
				.toList();

		List<String> paths = uploadedFiles.stream()
				.map(UploadedFileResponse::path)
				.toList();

		return new UploadImagesResponse("Images uploaded successfully", paths, uploadedFiles);
	}

	public UploadedFileResponse storeImage(MultipartFile file, String folder) {
		String sanitizedFolder = sanitizeFolder(folder);
		Path targetDirectory = uploadRoot.resolve(sanitizedFolder);

		try {
			Files.createDirectories(targetDirectory);
		} catch (IOException exception) {
			throw new StorageException("Unable to create upload directory", exception);
		}

		return storeSingleFile(file, sanitizedFolder, targetDirectory);
	}

	private UploadedFileResponse storeSingleFile(MultipartFile file, String folder, Path targetDirectory) {
		if (file == null || file.isEmpty()) {
			throw new BadRequestException("Uploaded image must not be empty");
		}

		String originalName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "image" : file.getOriginalFilename());
		String extension = extractAllowedExtension(originalName, file.getContentType());
		String storedName = Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + extension;
		Path targetPath = targetDirectory.resolve(storedName).normalize();

		if (!targetPath.startsWith(targetDirectory)) {
			throw new BadRequestException("Invalid file path");
		}

		try (InputStream inputStream = file.getInputStream()) {
			Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
		} catch (IOException exception) {
			throw new StorageException("Unable to store uploaded image", exception);
		}

		return new UploadedFileResponse(
				originalName,
				storedName,
				"/uploads/" + folder + "/" + storedName,
				file.getContentType(),
				file.getSize()
		);
	}

	private String sanitizeFolder(String folder) {
		String value = folder == null ? "misc" : folder.trim().toLowerCase(Locale.ROOT);
		if (value.isEmpty()) {
			return "misc";
		}
		String sanitized = value.replaceAll("[^a-z0-9-_]", "-");
		return sanitized.isBlank() ? "misc" : sanitized;
	}

	private String extractAllowedExtension(String originalName, String contentType) {
		String lowercaseName = originalName.toLowerCase(Locale.ROOT);
		for (String extension : ALLOWED_EXTENSIONS) {
			if (lowercaseName.endsWith(extension)) {
				return extension;
			}
		}

		if (contentType != null && contentType.startsWith("image/")) {
			return switch (contentType.toLowerCase(Locale.ROOT)) {
				case "image/jpeg", "image/jpg" -> ".jpg";
				case "image/png" -> ".png";
				case "image/gif" -> ".gif";
				case "image/webp" -> ".webp";
				default -> throw new BadRequestException("Unsupported image type");
			};
		}

		throw new BadRequestException("Only image files are allowed");
	}
}
