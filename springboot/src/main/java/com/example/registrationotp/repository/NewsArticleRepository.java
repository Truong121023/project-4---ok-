package com.example.registrationotp.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.example.registrationotp.model.NewsArticle;

public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long>, JpaSpecificationExecutor<NewsArticle> {

	java.util.List<NewsArticle> findAllByRelatedStoreId(Long relatedStoreId);

	Optional<NewsArticle> findBySlugIgnoreCase(String slug);

	boolean existsBySlugIgnoreCase(String slug);

	boolean existsBySlugIgnoreCaseAndIdNot(String slug, Long id);
}
