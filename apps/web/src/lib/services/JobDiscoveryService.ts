import { db } from '../utils/database';
import { jobAggregationService } from './jobAggregation';
import { jobStatisticsService } from './JobStatisticsService';

export interface ClientJobPreferences {
  id: string;
  client_id: string;
  title: string;
  company?: string;
  location: string;
  work_type: 'remote' | 'hybrid' | 'onsite';
  visa_sponsorship: boolean;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  status: 'active' | 'paused' | 'achieved';
  created_at: Date;
  updated_at: Date;
}

export interface ClassifiedJobListing {
  id: string;
  title: string;
  company: string;
  company_website?: string;
  location: string;
  salary?: string;
  salary_min?: number;
  salary_max?: number;
  description: string;
  apply_url?: string;
  source: string;
  posted_date: Date;
  job_type?: string;
  work_location?: string;
  requirements?: string[];
  benefits?: string[];
  // Classification fields
  is_ai_applicable: boolean;
  confidence_score: number;
  classification_reasons: string[];
  application_method: 'form' | 'email' | 'manual';
  match_percentage: number;
}

export interface JobSearchFilters {
  keywords?: string;
  location?: string;
  page?: number;
  limit?: number;
  salaryMin?: number;
  salaryMax?: number;
  workType?: 'remote' | 'hybrid' | 'onsite';
  source?: string;
  aiApplicableOnly?: boolean;
  aiFilterType?: 'all' | 'ai_only' | 'manual_only' | 'high_confidence' | 'medium_confidence' | 'low_confidence';
}

export class JobDiscoveryService {
  /**
   * Get filtered jobs for a specific client based on their preferences
   */
  async getFilteredJobsForClient(clientId: string, filters: JobSearchFilters = {}): Promise<ClassifiedJobListing[]> {
    try {
      // 1. Get client preferences
      const clientPreferences = await this.getClientPreferences(clientId);

      if (clientPreferences.length === 0) {
        console.log(`No preferences found for client ${clientId}, using default search`);
        // Use default search parameters if no preferences
        const defaultSearchFilters = {
          keywords: filters.keywords || 'software engineer',
          location: filters.location || 'London',
          workType: filters.workType || 'onsite',
          salaryMin: filters.salaryMin,
          salaryMax: filters.salaryMax,
          limit: filters.limit || 20
        };

        // Search with default parameters
        const jobSearchResponse = await jobAggregationService.searchJobs(defaultSearchFilters);
        const jobs = jobSearchResponse.jobs || [];

        if (jobs.length === 0) {
          console.log(`No jobs found with default search`);
          return [];
        }

        // Create classified job listings with basic match scores
        const classifiedJobListings: ClassifiedJobListing[] = jobs.map(job => {
          // Simple AI applicability check based on company website
          const hasCompanyWebsite = job.company_website && job.company_website.length > 0;
          const hasApplyUrl = job.applyUrl && job.applyUrl.length > 0;

          const isAiApplicable = Boolean(hasCompanyWebsite);
          const confidenceScore = hasCompanyWebsite ? (hasApplyUrl ? 0.8 : 0.6) : 0.1;
          const classificationReasons = hasCompanyWebsite
            ? ['Has company website']
            : ['No company website for email discovery'];
          const applicationMethod = hasApplyUrl ? 'form' : 'email';

          return {
            id: job.id,
            title: job.title,
            company: job.company,
            company_website: job.company_website,
            location: job.location,
            salary: job.salary,
            salary_min: job.salaryMin,
            salary_max: job.salaryMax,
            description: job.descriptionSnippet || '',
            apply_url: job.applyUrl,
            source: job.source,
            posted_date: new Date(job.postedDate),
            job_type: job.jobType,
            work_location: job.workLocation,
            requirements: job.requirements,
            benefits: job.benefits,
            is_ai_applicable: isAiApplicable,
            confidence_score: confidenceScore,
            classification_reasons: classificationReasons,
            application_method: applicationMethod,
            match_percentage: 50 // Default match percentage for jobs without preferences
          };
        });

        // Apply AI filtering
        let filteredJobs = this.applyAiFiltering(classifiedJobListings, filters);

        // Sort by match percentage and confidence score
        filteredJobs.sort((a, b) => {
          // First by match percentage (descending)
          if (b.match_percentage !== a.match_percentage) {
            return b.match_percentage - a.match_percentage;
          }
          // Then by confidence score (descending)
          return b.confidence_score - a.confidence_score;
        });

        // Apply pagination
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        return filteredJobs.slice(startIndex, endIndex);
      }

      // 2. Fetch jobs for all preferred job titles
      const allJobs = await this.fetchJobsForAllPreferences(clientPreferences, filters);

      if (allJobs.length === 0) {
        console.log(`No jobs found for client ${clientId}`);
        return [];
      }

      // 3. Create classified job listings with enhanced match scores
      const classifiedJobListings: ClassifiedJobListing[] = allJobs.map(job => {
        // Enhanced AI applicability check
        const hasCompanyWebsite = job.company_website && job.company_website.length > 0;
        const hasApplyUrl = job.applyUrl && job.applyUrl.length > 0;

        const isAiApplicable = Boolean(hasCompanyWebsite);
        const confidenceScore = hasCompanyWebsite ? (hasApplyUrl ? 0.8 : 0.6) : 0.1;
        const classificationReasons = hasCompanyWebsite
          ? ['Has company website']
          : ['No company website for email discovery'];
        const applicationMethod = hasApplyUrl ? 'form' : 'email';

        const matchPercentage = this.calculateEnhancedMatchPercentage(job, clientPreferences);

        return {
          id: job.id,
          title: job.title,
          company: job.company,
          company_website: job.company_website,
          location: job.location,
          salary: job.salary,
          salary_min: job.salaryMin,
          salary_max: job.salaryMax,
          description: job.descriptionSnippet || '',
          apply_url: job.applyUrl,
          source: job.source,
          posted_date: new Date(job.postedDate),
          job_type: job.jobType,
          work_location: job.workLocation,
          requirements: job.requirements,
          benefits: job.benefits,
          is_ai_applicable: isAiApplicable,
          confidence_score: confidenceScore,
          classification_reasons: classificationReasons,
          application_method: applicationMethod,
          match_percentage: matchPercentage
        };
      });

      // 4. Apply AI filtering
      let filteredJobs = this.applyAiFiltering(classifiedJobListings, filters);

      // 5. Sort by location priority and match percentage
      filteredJobs.sort((a, b) => {
        // First by location priority (exact match > partial match > remote compatibility)
        const locationScoreA = this.calculateLocationPriority(a, clientPreferences);
        const locationScoreB = this.calculateLocationPriority(b, clientPreferences);

        if (locationScoreB !== locationScoreA) {
          return locationScoreB - locationScoreA;
        }

        // Then by match percentage (descending)
        if (b.match_percentage !== a.match_percentage) {
          return b.match_percentage - a.match_percentage;
        }

        // Finally by confidence score (descending)
        return b.confidence_score - a.confidence_score;
      });

      // 6. Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      return filteredJobs.slice(startIndex, endIndex);
    } catch (error) {
      console.error('Error getting filtered jobs for client:', error);
      throw error;
    }
  }

  /**
   * Get client job preferences
   */
  private async getClientPreferences(clientId: string): Promise<ClientJobPreferences[]> {
    try {
      const result = await db.query(
        `SELECT * FROM job_preferences 
         WHERE client_id = $1 AND status = 'active'
         ORDER BY created_at DESC`,
        [clientId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting client preferences:', error);
      throw error;
    }
  }

  /**
   * Build search filters from client preferences
   */
  private buildSearchFiltersFromPreferences(
    preferences: ClientJobPreferences[],
    additionalFilters: JobSearchFilters
  ): JobSearchFilters {
    // Use the most recent preference or combine multiple preferences
    const primaryPreference = preferences[0];

    const searchFilters: JobSearchFilters = {
      keywords: primaryPreference.title,
      location: primaryPreference.location,
      salaryMin: primaryPreference.salary_min,
      salaryMax: primaryPreference.salary_max,
      workType: primaryPreference.work_type,
      page: additionalFilters.page || 1,
      limit: additionalFilters.limit || 50
    };

    // Override with additional filters if provided
    if (additionalFilters.keywords) searchFilters.keywords = additionalFilters.keywords;
    if (additionalFilters.location) searchFilters.location = additionalFilters.location;
    if (additionalFilters.salaryMin !== undefined) searchFilters.salaryMin = additionalFilters.salaryMin;
    if (additionalFilters.salaryMax !== undefined) searchFilters.salaryMax = additionalFilters.salaryMax;
    if (additionalFilters.workType) searchFilters.workType = additionalFilters.workType;
    if (additionalFilters.source) searchFilters.source = additionalFilters.source;

    return searchFilters;
  }

  /**
   * Calculate match percentage between job and client preferences
   */
  private calculateMatchPercentage(job: any, preferences: ClientJobPreferences[]): number {
    let matchScore = 0;
    let totalWeight = 0;

    for (const preference of preferences) {
      let preferenceScore = 0;
      let preferenceWeight = 0;

      // Title/Keywords match (weight: 40%)
      if (preference.title && job.title) {
        const titleMatch = this.calculateTextSimilarity(
          preference.title.toLowerCase(),
          job.title.toLowerCase()
        );
        preferenceScore += titleMatch * 0.4;
        preferenceWeight += 0.4;
      }

      // Location match (weight: 25%)
      if (preference.location && job.location) {
        const locationMatch = this.calculateLocationMatch(
          preference.location,
          job.location,
          preference.work_type,
          job.work_location
        );
        preferenceScore += locationMatch * 0.25;
        preferenceWeight += 0.25;
      }

      // Salary match (weight: 20%)
      if (preference.salary_min && job.salary_min) {
        const salaryMatch = this.calculateSalaryMatch(
          preference.salary_min,
          preference.salary_max,
          job.salary_min,
          job.salary_max
        );
        preferenceScore += salaryMatch * 0.2;
        preferenceWeight += 0.2;
      }

      // Work type match (weight: 15%)
      if (preference.work_type && job.work_location) {
        const workTypeMatch = this.calculateWorkTypeMatch(
          preference.work_type,
          job.work_location
        );
        preferenceScore += workTypeMatch * 0.15;
        preferenceWeight += 0.15;
      }

      // Add to total score
      matchScore += preferenceScore;
      totalWeight += preferenceWeight;
    }

    // Return percentage (0-100)
    return totalWeight > 0 ? Math.round((matchScore / totalWeight) * 100) : 0;
  }

  /**
   * Calculate text similarity between two strings
   */
  private calculateTextSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;

    return commonWords.length / totalWords;
  }

  /**
   * Calculate location match score
   */
  private calculateLocationMatch(
    preferenceLocation: string,
    jobLocation: string,
    preferenceWorkType: string,
    jobWorkLocation?: string
  ): number {
    // Exact match
    if (preferenceLocation.toLowerCase() === jobLocation.toLowerCase()) {
      return 1.0;
    }

    // Remote work compatibility
    if (preferenceWorkType === 'remote' && jobWorkLocation === 'remote') {
      return 0.9;
    }

    // Partial match (same city or country)
    const prefParts = preferenceLocation.toLowerCase().split(',');
    const jobParts = jobLocation.toLowerCase().split(',');

    for (const prefPart of prefParts) {
      for (const jobPart of jobParts) {
        if (prefPart.trim() === jobPart.trim()) {
          return 0.7;
        }
      }
    }

    return 0.3; // Default partial match
  }

  /**
   * Calculate salary match score
   */
  private calculateSalaryMatch(
    prefMin: number,
    prefMax: number | undefined,
    jobMin: number,
    jobMax: number | undefined
  ): number {
    const prefMid = prefMax ? (prefMin + prefMax) / 2 : prefMin;
    const jobMid = jobMax ? (jobMin + jobMax) / 2 : jobMin;

    // Perfect match
    if (Math.abs(prefMid - jobMid) < 1000) {
      return 1.0;
    }

    // Within 20% range
    const diff = Math.abs(prefMid - jobMid) / prefMid;
    if (diff <= 0.2) {
      return 0.8;
    }

    // Within 50% range
    if (diff <= 0.5) {
      return 0.6;
    }

    return 0.3; // Default partial match
  }

  /**
   * Calculate work type match score
   */
  private calculateWorkTypeMatch(preference: string, jobWorkLocation?: string): number {
    if (!jobWorkLocation) return 0.5;

    const pref = preference.toLowerCase();
    const job = jobWorkLocation.toLowerCase();

    // Exact match
    if (pref === job) {
      return 1.0;
    }

    // Remote compatibility
    if (pref === 'remote' && job === 'remote') {
      return 1.0;
    }

    // Hybrid compatibility
    if ((pref === 'hybrid' && job === 'hybrid') ||
      (pref === 'hybrid' && job === 'onsite') ||
      (pref === 'onsite' && job === 'hybrid')) {
      return 0.8;
    }

    return 0.3; // Default partial match
  }

  /**
   * Get applied job IDs for a client to filter them out
   */
  async getAppliedJobIds(clientId: string): Promise<string[]> {
    try {
      const result = await db.query(
        'SELECT job_id FROM applications WHERE client_id = $1 AND job_id IS NOT NULL',
        [clientId]
      );

      return result.rows.map(row => row.job_id);
    } catch (error) {
      console.error('Error getting applied job IDs:', error);
      return [];
    }
  }

  /**
   * Fetch jobs for all client preferences
   */
  private async fetchJobsForAllPreferences(
    preferences: ClientJobPreferences[],
    filters: JobSearchFilters
  ): Promise<any[]> {
    const allJobs: any[] = [];
    const seenJobIds = new Set<string>();

    // Fetch jobs for each preference
    for (const preference of preferences) {
      const searchFilters = this.buildSearchFiltersFromPreferences([preference], filters);

      try {
        const jobSearchResponse = await jobAggregationService.searchJobs(searchFilters);
        const jobs = jobSearchResponse.jobs || [];

        // Add unique jobs only
        for (const job of jobs) {
          const jobKey = `${job.title}-${job.company}-${job.location}`;
          if (!seenJobIds.has(jobKey)) {
            seenJobIds.add(jobKey);
            allJobs.push(job);
          }
        }
      } catch (error) {
        console.error(`Error fetching jobs for preference ${preference.id}:`, error);
        // Continue with other preferences
      }
    }

    return allJobs;
  }

  /**
   * Apply AI filtering based on filter type
   */
  private applyAiFiltering(jobs: ClassifiedJobListing[], filters: JobSearchFilters): ClassifiedJobListing[] {
    if (!filters.aiFilterType || filters.aiFilterType === 'all') {
      return jobs;
    }

    switch (filters.aiFilterType) {
      case 'ai_only':
        return jobs.filter(job => job.is_ai_applicable);
      case 'manual_only':
        return jobs.filter(job => !job.is_ai_applicable);
      case 'high_confidence':
        return jobs.filter(job => job.is_ai_applicable && job.confidence_score >= 0.8);
      case 'medium_confidence':
        return jobs.filter(job => job.is_ai_applicable && job.confidence_score >= 0.6 && job.confidence_score < 0.8);
      case 'low_confidence':
        return jobs.filter(job => job.is_ai_applicable && job.confidence_score < 0.6);
      default:
        return jobs;
    }
  }

  /**
   * Calculate enhanced match percentage considering multiple preferences
   */
  private calculateEnhancedMatchPercentage(job: any, preferences: ClientJobPreferences[]): number {
    let bestMatch = 0;

    for (const preference of preferences) {
      const match = this.calculateMatchPercentage(job, [preference]);
      bestMatch = Math.max(bestMatch, match);
    }

    return bestMatch;
  }

  /**
   * Calculate location priority score for sorting
   */
  private calculateLocationPriority(job: ClassifiedJobListing, preferences: ClientJobPreferences[]): number {
    let bestLocationScore = 0;

    for (const preference of preferences) {
      const locationMatch = this.calculateLocationMatch(
        preference.location,
        job.location,
        preference.work_type,
        job.work_location
      );
      bestLocationScore = Math.max(bestLocationScore, locationMatch);
    }

    return bestLocationScore;
  }

  /**
   * Get job discovery statistics for a client
   */
  async getClientJobStats(clientId: string): Promise<{
    total_jobs_found: number;
    ai_applicable_jobs: number;
    manual_only_jobs: number;
    average_match_percentage: number;
  }> {
    try {
      const jobs = await this.getFilteredJobsForClient(clientId, { limit: 1000 });
      return await jobStatisticsService.getClientJobStats(jobs);
    } catch (error) {
      console.error('Error getting client job stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const jobDiscoveryService = new JobDiscoveryService();
