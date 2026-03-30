package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.NewsArticle;

public record NewsArticleResponse(
		Long id,
		String title,
		String slug,
		String summary,
		String content,
		Long relatedStoreId,
		String relatedStoreSlug,
		String relatedStoreName,
		List<String> tags,
		List<String> imagePaths,
		List<ContentSectionResponse> sections,
		boolean featured,
		boolean published,
		Instant publishedAt,
		Instant createdAt,
		Instant updatedAt
) {

	public static NewsArticleResponse from(NewsArticle newsArticle) {
		return new NewsArticleResponse(
				newsArticle.getId(),
				newsArticle.getTitle(),
				newsArticle.getSlug(),
				newsArticle.getSummary(),
				newsArticle.getContent(),
				newsArticle.getRelatedStore() != null ? newsArticle.getRelatedStore().getId() : null,
				newsArticle.getRelatedStore() != null ? newsArticle.getRelatedStore().getSlug() : null,
				newsArticle.getRelatedStore() != null ? newsArticle.getRelatedStore().getName() : null,
				List.copyOf(newsArticle.getTags()),
				List.copyOf(newsArticle.getImagePaths()),
				ContentSectionResponse.fromList(newsArticle.getSections()),
				newsArticle.isFeatured(),
				newsArticle.isPublished(),
				newsArticle.getPublishedAt(),
				newsArticle.getCreatedAt(),
				newsArticle.getUpdatedAt()
		);
	}
}
