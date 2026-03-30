package com.example.registrationotp.config;

import java.sql.SQLException;
import java.util.Locale;

import javax.sql.DataSource;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class NotificationSchemaInitializer implements ApplicationRunner {

	private final JdbcTemplate jdbcTemplate;
	private final DataSource dataSource;

	public NotificationSchemaInitializer(JdbcTemplate jdbcTemplate, DataSource dataSource) {
		this.jdbcTemplate = jdbcTemplate;
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (!isMySql()) {
			return;
		}

		jdbcTemplate.execute("""
				create table if not exists user_notifications (
				    id bigint not null auto_increment,
				    created_at datetime(6) not null,
				    message varchar(1000) not null,
				    read_at datetime(6),
				    related_event_id bigint,
				    related_order_id bigint,
				    related_store_id bigint,
				    related_store_name varchar(180),
				    title varchar(180) not null,
				    type varchar(30) not null,
				    user_id bigint not null,
				    primary key (id),
				    constraint fk_user_notifications_user foreign key (user_id) references users (id)
				)
				""");
	}

	private boolean isMySql() {
		try (var connection = dataSource.getConnection()) {
			String databaseProductName = connection.getMetaData().getDatabaseProductName();
			return databaseProductName != null && databaseProductName.toLowerCase(Locale.ROOT).contains("mysql");
		} catch (SQLException exception) {
			throw new IllegalStateException("Failed to inspect database metadata", exception);
		}
	}
}
