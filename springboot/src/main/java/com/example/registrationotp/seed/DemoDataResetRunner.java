package com.example.registrationotp.seed;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.demo", name = "reseed", havingValue = "true")
public class DemoDataResetRunner implements ApplicationRunner {

	private final DemoDataSeeder demoDataSeeder;
	private final ConfigurableApplicationContext context;

	public DemoDataResetRunner(DemoDataSeeder demoDataSeeder, ConfigurableApplicationContext context) {
		this.demoDataSeeder = demoDataSeeder;
		this.context = context;
	}

	@Override
	public void run(ApplicationArguments args) throws Exception {
		demoDataSeeder.reseed();
		int exitCode = SpringApplication.exit(context, () -> 0);
		System.exit(exitCode);
	}
}
