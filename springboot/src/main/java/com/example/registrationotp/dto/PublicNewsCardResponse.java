package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.NewsArticle;

public record PublicNewsCardResponse(
		Long id,
		String title,
		String slug,
		String summary,
		Long relatedStoreId,
		String relatedStoreSlug,
		String relatedStoreName,
		List<String> tags,
		List<String> imagePaths,
		boolean featured,
		Instant publishedAt,
		Instant createdAt
) {

	public static PublicNewsCardResponse from(NewsArticle newsArticle) {
		return new PublicNewsCardResponse(
				newsArticle.getId(),
				newsArticle.getTitle(),
				newsArticle.getSlug(),
				newsArticle.getSummary(),
				newsArticle.getRelatedStore() != null ? newsArticle.getRelatedStore().getId() : null,
				newsArticle.getRelatedStore() != null ? newsArticle.getRelatedStore().getSlug() : null,
				newsArticle.getRelatedStore() != null ? newsArticle.getRelatedStore().getName() : null,
				List.copyOf(newsArticle.getTags()),
				List.copyOf(newsArticle.getImagePaths()),
				newsArticle.isFeatured(),
				newsArticle.getPublishedAt(),
				newsArticle.getCreatedAt()
		);
	}
}
