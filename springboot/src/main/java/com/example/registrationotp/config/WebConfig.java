package com.example.registrationotp.config;

import java.nio.file.Path;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

	private final CorsProperties corsProperties;
	private final UploadProperties uploadProperties;

	public WebConfig(CorsProperties corsProperties, UploadProperties uploadProperties) {
		this.corsProperties = corsProperties;
		this.uploadProperties = uploadProperties;
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/api/**")
				.allowedOrigins(corsProperties.getAllowedOrigins().toArray(String[]::new))
				.allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
				.allowedHeaders("*")
				.exposedHeaders("Authorization")
				.allowCredentials(false)
				.maxAge(3600);
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		String uploadLocation = Path.of(uploadProperties.getDir())
				.toAbsolutePath()
				.normalize()
				.toUri()
				.toString();

		registry.addResourceHandler("/uploads/**")
				.addResourceLocations(uploadLocation)
				.setCacheControl(CacheControl.noCache());
	}
}
