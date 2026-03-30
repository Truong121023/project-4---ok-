package com.example.registrationotp;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class RegistrationOtpApplication {

	public static void main(String[] args) {
		SpringApplication.run(RegistrationOtpApplication.class, args);
	}

}
// .\mvnw.cmd spring-boot:run