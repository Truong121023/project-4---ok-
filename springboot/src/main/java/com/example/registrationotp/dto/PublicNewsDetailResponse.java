package com.example.registrationotp.dto;

import java.time.Instant;
import java.util.List;

import com.example.registrationotp.model.NewsArticle;

public record PublicNewsDetailResponse(
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
		Instant publishedAt,
		Instant createdAt,
		Instant updatedAt
) {

	public static PublicNewsDetailResponse from(NewsArticle newsArticle) {
		return new PublicNewsDetailResponse(
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
				newsArticle.getPublishedAt(),
				newsArticle.getCreatedAt(),
				newsArticle.getUpdatedAt()
		);
	}
}
