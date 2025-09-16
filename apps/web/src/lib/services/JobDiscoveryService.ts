import { db, redis } from '../utils/database';
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
  workType?: 'remote' | 'hybrid' | 'onsite' | 'all';
  source?: string;
  aiApplicableOnly?: boolean;
  aiFilterType?: 'all' | 'ai_only' | 'manual_only' | 'high_confidence' | 'medium_confidence' | 'low_confidence';
}

export class JobDiscoveryService {
  /**
   * Get filtered jobs for a specific client based on their preferences
   * Now optimized with database-level filtering and caching
   */
  async getFilteredJobsForClient(clientId: string, filters: JobSearchFilters = {}): Promise<ClassifiedJobListing[]> {
    // Check cache first
    const cacheKey = `client_jobs:${clientId}:${JSON.stringify(filters)}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for client ${clientId}`);
      return JSON.parse(cached);
    }

    console.log(`🔍 Cache miss, fetching jobs for client ${clientId}`);
    const result = await this.getFilteredJobsForClientFromDB(clientId, filters);

    // Cache result for 5 minutes
    await redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  /**
   * Check if stored jobs are fresh (less than 24 hours old)
   */
  private async areJobsFresh(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT COUNT(*) as count, MAX(posted_date) as latest_job_date
        FROM jobs 
        WHERE posted_date >= NOW() - INTERVAL '24 hours'
      `);

      const { count, latest_job_date } = result.rows[0];
      const hasRecentJobs = parseInt(count) > 0;

      console.log(`🔍 Job freshness check: ${count} jobs in last 24 hours, latest: ${latest_job_date}`);
      return hasRecentJobs;
    } catch (error) {
      console.error('Error checking job freshness:', error);
      return false;
    }
  }

  /**
   * Get filtered jobs directly from database with optimized queries and external API fallback
   */
  private async getFilteredJobsForClientFromDB(clientId: string, filters: JobSearchFilters = {}): Promise<ClassifiedJobListing[]> {
    try {
      // 1. Check if we have fresh jobs in database (less than 24 hours old)
      const hasFreshJobs = await this.areJobsFresh();

      if (!hasFreshJobs) {
        console.log(`🔄 No fresh jobs in database, fetching from external APIs for client ${clientId}`);
        return await this.fetchJobsFromExternalAPIs(clientId, filters);
      }

      // 2. Get client preferences
      const clientPreferences = await this.getClientPreferences(clientId);

      if (clientPreferences.length === 0) {
        console.log(`No preferences found for client ${clientId}, using default search`);
        return await this.getDefaultJobsFromDB(filters);
      }

      // 3. Build optimized database query based on client preferences
      let jobs = await this.queryJobsFromDB(clientPreferences, filters);

      // If no jobs found with preferences, try a broader search
      if (jobs.length === 0) {
        console.log(`No jobs found with preferences, trying broader search for client ${clientId}`);
        jobs = await this.getDefaultJobsFromDB(filters);
      }

      // 4. If still no jobs found in database, fall back to external APIs
      if (jobs.length === 0) {
        console.log(`No jobs found in database, fetching from external APIs for client ${clientId}`);
        return await this.fetchJobsFromExternalAPIs(clientId, filters);
      }

      // 3. Create classified job listings with enhanced match scores
      const classifiedJobListings: ClassifiedJobListing[] = jobs.map(job => {
        // Enhanced AI applicability check
        const hasCompanyWebsite = job.company_website && job.company_website.length > 0;
        const hasApplyUrl = job.apply_url && job.apply_url.length > 0;

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
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          description: job.description_snippet || '',
          apply_url: job.apply_url,
          source: job.source,
          posted_date: new Date(job.posted_date),
          job_type: job.job_type,
          work_location: job.work_location,
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

      // 5. Sort by match percentage and confidence score
      filteredJobs.sort((a, b) => {
        // First by match percentage (descending)
        if (b.match_percentage !== a.match_percentage) {
          return b.match_percentage - a.match_percentage;
        }

        // Then by confidence score (descending)
        return b.confidence_score - a.confidence_score;
      });

      // 6. Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      return filteredJobs.slice(startIndex, endIndex);
    } catch (error) {
      console.error('Error getting filtered jobs from DB:', error);
      throw error;
    }
  }

  /**
   * Get default jobs from database when no client preferences exist
   */
  private async getDefaultJobsFromDB(filters: JobSearchFilters = {}): Promise<ClassifiedJobListing[]> {
    const keywords = filters.keywords || 'software engineer';
    const location = filters.location || 'London';
    const workType = filters.workType;
    const limit = filters.limit || 20;

    // Build search conditions
    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (keywords) {
      paramCount++;
      conditions.push(`(to_tsvector('english', title) @@ plainto_tsquery('english', $${paramCount}) OR to_tsvector('english', company) @@ plainto_tsquery('english', $${paramCount}))`);
      params.push(keywords);
    }

    if (location) {
      paramCount++;
      conditions.push(`(to_tsvector('english', location) @@ plainto_tsquery('english', $${paramCount}) OR work_location = 'remote')`);
      params.push(location);
    }

    if (workType && workType !== 'all') {
      paramCount++;
      conditions.push(`work_location = $${paramCount}`);
      params.push(workType);
    }

    // Default to AI-applicable jobs only when no preferences exist
    // This ensures the system focuses on jobs that can be automatically applied to
    const shouldFilterAiOnly = filters.aiApplicableOnly !== false &&
      (filters.aiFilterType === 'ai_only' || filters.aiFilterType === undefined);

    if (shouldFilterAiOnly) {
      conditions.push(`company_website IS NOT NULL AND company_website != ''`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    paramCount++;
    params.push(limit);

    const query = `
      SELECT 
        id, title, company, company_website, location, salary, salary_min, salary_max,
        description_snippet, apply_url, source, posted_date, job_type, work_location,
        requirements, benefits, auto_apply_status
      FROM jobs 
      ${whereClause}
      ORDER BY 
        CASE WHEN search_vector IS NOT NULL THEN 1 ELSE 2 END,
        posted_date DESC, 
        auto_apply_status DESC
      LIMIT $${paramCount}
    `;

    const result = await db.query(query, params);
    const jobs = result.rows;

    if (jobs.length === 0) {
      console.log(`No jobs found with default search`);
      return [];
    }

    // Create classified job listings with basic match scores
    return jobs.map((job: any) => {
      const hasCompanyWebsite = job.company_website && job.company_website.length > 0;
      const hasApplyUrl = job.apply_url && job.apply_url.length > 0;

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
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        description: job.description_snippet || '',
        apply_url: job.apply_url,
        source: job.source,
        posted_date: new Date(job.posted_date),
        job_type: job.job_type,
        work_location: job.work_location,
        requirements: job.requirements,
        benefits: job.benefits,
        is_ai_applicable: isAiApplicable,
        confidence_score: confidenceScore,
        classification_reasons: classificationReasons,
        application_method: applicationMethod,
        match_percentage: 50 // Default match percentage for jobs without preferences
      };
    });
  }


  /**
   * Query jobs from database with optimized filtering based on client preferences
   */
  private async queryJobsFromDB(clientPreferences: ClientJobPreferences[], filters: JobSearchFilters = {}): Promise<any[]> {
    // Build search conditions based on client preferences
    const conditions = [];
    const params = [];
    let paramCount = 0;

    // Create a more flexible query that uses OR logic for better matching
    const preferenceConditions = [];

    if (clientPreferences.length > 0) {
      // For each preference, create a condition that matches title OR location OR work type
      for (const pref of clientPreferences) {
        const prefConditions = [];

        // Title matching using FTS
        if (pref.title) {
          paramCount++;
          params.push(pref.title);
          prefConditions.push(`to_tsvector('english', title) @@ plainto_tsquery('english', $${paramCount})`);
        }

        // Location matching using FTS
        if (pref.location) {
          paramCount++;
          params.push(pref.location);
          prefConditions.push(`to_tsvector('english', location) @@ plainto_tsquery('english', $${paramCount})`);
        }

        // Work type matching
        if (pref.work_type) {
          paramCount++;
          params.push(pref.work_type);
          prefConditions.push(`work_location = $${paramCount}`);
        }

        // Salary range matching
        if (pref.salary_min || pref.salary_max) {
          if (pref.salary_min) {
            paramCount++;
            params.push(pref.salary_min);
            prefConditions.push(`salary_min >= $${paramCount}`);
          }
          if (pref.salary_max) {
            paramCount++;
            params.push(pref.salary_max);
            prefConditions.push(`salary_max <= $${paramCount}`);
          }
        }

        // If we have any conditions for this preference, add them
        if (prefConditions.length > 0) {
          preferenceConditions.push(`(${prefConditions.join(' OR ')})`);
        }
      }
    }

    // Add preference-based conditions
    if (preferenceConditions.length > 0) {
      conditions.push(`(${preferenceConditions.join(' OR ')})`);
    }

    // Add AI applicability filter if requested
    if (filters.aiApplicableOnly) {
      conditions.push(`company_website IS NOT NULL AND company_website != ''`);
    }

    // Add additional filters
    if (filters.keywords) {
      paramCount++;
      conditions.push(`(to_tsvector('english', title) @@ plainto_tsquery('english', $${paramCount}) OR to_tsvector('english', company) @@ plainto_tsquery('english', $${paramCount}))`);
      params.push(filters.keywords);
    }

    if (filters.location) {
      paramCount++;
      conditions.push(`(to_tsvector('english', location) @@ plainto_tsquery('english', $${paramCount}) OR work_location = 'remote')`);
      params.push(filters.location);
    }

    if (filters.workType && filters.workType !== 'all') {
      paramCount++;
      conditions.push(`work_location = $${paramCount}`);
      params.push(filters.workType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    paramCount++;
    params.push(filters.limit || 100); // Get more results for better filtering

    const query = `
      SELECT 
        id, title, company, company_website, location, salary, salary_min, salary_max,
        description_snippet, apply_url, source, posted_date, job_type, work_location,
        requirements, benefits, auto_apply_status
      FROM jobs 
      ${whereClause}
      ORDER BY 
        CASE WHEN search_vector IS NOT NULL THEN 1 ELSE 2 END,
        posted_date DESC, 
        auto_apply_status DESC
      LIMIT $${paramCount}
    `;

    console.log('🔍 Executing query:', query);
    console.log('🔍 With params:', params);

    const result = await db.query(query, params);
    console.log(`🔍 Query returned ${result.rows.length} jobs`);
    return result.rows;
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
   * Fetch jobs from external APIs and store them in database
   */
  private async fetchJobsFromExternalAPIs(clientId: string, filters: JobSearchFilters): Promise<ClassifiedJobListing[]> {
    try {
      console.log(`🌐 Fetching jobs from external APIs for client ${clientId}`);

      // Get client preferences to build search filters
      const clientPreferences = await this.getClientPreferences(clientId);

      let searchFilters: JobSearchFilters;

      if (clientPreferences.length > 0) {
        // Use client preferences to build search filters
        searchFilters = this.buildSearchFiltersFromPreferences(clientPreferences, filters);
      } else {
        // Use default search filters
        searchFilters = {
          keywords: filters.keywords || 'software engineer',
          location: filters.location || 'London',
          workType: filters.workType,
          page: 1,
          limit: filters.limit || 50, // Fetch more jobs from external APIs
          ...filters
        };
      }

      // Fetch jobs from external APIs
      const jobSearchResponse = await jobAggregationService.searchJobs(searchFilters);
      const externalJobs = jobSearchResponse.jobs || [];

      console.log(`🌐 Fetched ${externalJobs.length} jobs from external APIs`);

      if (externalJobs.length === 0) {
        console.log(`No jobs found from external APIs for client ${clientId}`);
        return [];
      }

      // Convert external jobs to classified job listings
      const classifiedJobListings: ClassifiedJobListing[] = externalJobs.map((job: any) => {
        const hasCompanyWebsite = job.company_website && job.company_website.length > 0;
        const hasApplyUrl = job.applyUrl && job.applyUrl.length > 0;

        const isAiApplicable = Boolean(hasCompanyWebsite);
        const confidenceScore = hasCompanyWebsite ? (hasApplyUrl ? 0.8 : 0.6) : 0.1;
        const classificationReasons = hasCompanyWebsite
          ? ['Has company website']
          : ['No company website for email discovery'];
        const applicationMethod = hasApplyUrl ? 'form' : 'email';

        // Calculate match percentage based on client preferences
        const matchPercentage = clientPreferences.length > 0
          ? this.calculateEnhancedMatchPercentage(job, clientPreferences)
          : 50; // Default match percentage for jobs without preferences

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
          posted_date: new Date(job.postedDate || new Date()),
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

      // Filter to AI-applicable jobs only when no client preferences exist
      // This ensures the system focuses on jobs that can be automatically applied to
      let jobsToFilter = classifiedJobListings;
      if (clientPreferences.length === 0) {
        const shouldFilterAiOnly = filters.aiApplicableOnly !== false &&
          (filters.aiFilterType === 'ai_only' || filters.aiFilterType === undefined);

        if (shouldFilterAiOnly) {
          jobsToFilter = classifiedJobListings.filter(job => job.is_ai_applicable);
          console.log(`🔍 Filtered to ${jobsToFilter.length} AI-applicable jobs from ${classifiedJobListings.length} total jobs`);
        }
      }

      // Apply AI filtering if requested
      let filteredJobs = this.applyAiFiltering(jobsToFilter, filters);

      // Sort by match percentage and confidence score
      filteredJobs.sort((a, b) => {
        if (b.match_percentage !== a.match_percentage) {
          return b.match_percentage - a.match_percentage;
        }
        return b.confidence_score - a.confidence_score;
      });

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

      console.log(`✅ Returning ${paginatedJobs.length} classified jobs from external APIs`);
      return paginatedJobs;

    } catch (error) {
      console.error(`Error fetching jobs from external APIs for client ${clientId}:`, error);
      return [];
    }
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
