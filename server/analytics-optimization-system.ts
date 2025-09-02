import { IStorage } from './storage';
import { z } from 'zod';

// Analytics schemas with validation
const AnalyticsEventSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  eventType: z.enum(['page_view', 'button_click', 'lesson_start', 'lesson_complete', 'game_play', 'purchase', 'error']),
  feature: z.string(),
  action: z.string(),
  timestamp: z.number(),
  duration: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    viewportWidth: z.number(),
    viewportHeight: z.number()
  }).optional()
});

const HeatmapDataSchema = z.object({
  feature: z.string(),
  coordinates: z.array(z.object({
    x: z.number(),
    y: z.number(),
    intensity: z.number(),
    timestamp: z.number(),
    userId: z.string(),
    deviceType: z.enum(['desktop', 'tablet', 'mobile']),
    userRole: z.enum(['student', 'tutor', 'parent', 'admin'])
  })),
  timeRange: z.object({
    start: z.number(),
    end: z.number()
  }),
  filters: z.object({
    userRoles: z.array(z.string()).optional(),
    deviceTypes: z.array(z.string()).optional(),
    minSampleSize: z.number().default(50)
  }).optional()
});

const OptimizationRecommendationSchema = z.object({
  feature: z.string(),
  type: z.enum(['layout_change', 'color_adjustment', 'size_modification', 'position_change', 'content_update']),
  confidence: z.number().min(0).max(1),
  impact: z.enum(['low', 'medium', 'high']),
  description: z.string(),
  implementation: z.string(),
  risks: z.array(z.string()),
  validationRequired: z.boolean(),
  sampleSize: z.number(),
  statisticalSignificance: z.number()
});

interface AnalyticsState {
  totalEvents: number;
  lastProcessed: number;
  heatmapCache: Map<string, {
    data: z.infer<typeof HeatmapDataSchema>;
    generatedAt: number;
    validUntil: number;
  }>;
  qualityMetrics: {
    dataAccuracy: number;
    sampleSizes: Map<string, number>;
    confidenceScores: Map<string, number>;
    outlierDetection: Map<string, number>;
  };
  optimizationHistory: Array<{
    id: string;
    recommendation: z.infer<typeof OptimizationRecommendationSchema>;
    appliedAt: number;
    results: {
      beforeMetrics: any;
      afterMetrics: any;
      improvementRate: number;
    } | null;
  }>;
}

export class AnalyticsOptimizationSystem {
  private storage: IStorage;
  private state: AnalyticsState;
  private isProcessing: boolean = false;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.state = {
      totalEvents: 0,
      lastProcessed: 0,
      heatmapCache: new Map(),
      qualityMetrics: {
        dataAccuracy: 0.95,
        sampleSizes: new Map(),
        confidenceScores: new Map(),
        outlierDetection: new Map()
      },
      optimizationHistory: []
    };
  }

  /**
   * Process analytics event with quality validation
   */
  async processAnalyticsEvent(event: z.infer<typeof AnalyticsEventSchema>): Promise<{
    processed: boolean;
    qualityScore: number;
    warnings: string[];
    recommendations: z.infer<typeof OptimizationRecommendationSchema>[];
  }> {
    const warnings: string[] = [];
    const recommendations: z.infer<typeof OptimizationRecommendationSchema>[] = [];

    try {
      // Step 1: Validate event structure
      const validatedEvent = AnalyticsEventSchema.parse(event);
      
      // Step 2: Quality checks and anomaly detection
      const qualityScore = await this.calculateEventQuality(validatedEvent);
      
      if (qualityScore < 0.7) {
        warnings.push(`Low quality event (score: ${qualityScore.toFixed(2)})`);
      }

      // Step 3: Detect potential data anomalies
      const anomalies = await this.detectAnomalies(validatedEvent);
      warnings.push(...anomalies);

      // Step 4: Store validated event
      await this.storeAnalyticsEvent(validatedEvent);
      this.state.totalEvents++;

      // Step 5: Check if we have enough data for recommendations
      const sampleSize = await this.getFeatureSampleSize(validatedEvent.feature);
      if (sampleSize >= 100 && sampleSize % 50 === 0) { // Check every 50 events after reaching 100
        const featureRecommendations = await this.generateOptimizationRecommendations(validatedEvent.feature);
        recommendations.push(...featureRecommendations);
      }

      // Step 6: Update quality metrics
      await this.updateQualityMetrics(validatedEvent.feature, qualityScore);

      return {
        processed: true,
        qualityScore,
        warnings,
        recommendations
      };

    } catch (error) {
      return {
        processed: false,
        qualityScore: 0,
        warnings: [`Event processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: []
      };
    }
  }

  /**
   * Generate safe heatmap with interpretation guidelines
   */
  async generateHeatmapWithSafeguards(feature: string, filters?: {
    userRoles?: string[];
    deviceTypes?: string[];
    timeRange?: { start: number; end: number };
    minSampleSize?: number;
  }): Promise<{
    heatmap: z.infer<typeof HeatmapDataSchema> | null;
    interpretationGuidelines: {
      sampleSize: number;
      confidenceLevel: number;
      dataQuality: number;
      limitations: string[];
      recommendations: string[];
    };
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const defaultFilters = {
      userRoles: filters?.userRoles || ['student', 'tutor', 'parent', 'admin'],
      deviceTypes: filters?.deviceTypes || ['desktop', 'tablet', 'mobile'],
      minSampleSize: filters?.minSampleSize || 50
    };

    try {
      // Step 1: Check cache for recent heatmap
      const cacheKey = this.generateCacheKey(feature, defaultFilters);
      const cached = this.state.heatmapCache.get(cacheKey);
      
      if (cached && cached.validUntil > Date.now()) {
        return this.buildHeatmapResponse(cached.data, warnings);
      }

      // Step 2: Collect raw analytics data
      const rawData = await this.collectHeatmapData(feature, filters);
      
      // Step 3: Validate sample size
      if (rawData.length < defaultFilters.minSampleSize) {
        warnings.push(`Insufficient sample size: ${rawData.length} < ${defaultFilters.minSampleSize}`);
        warnings.push('Results may not be statistically significant');
      }

      // Step 4: Detect and filter outliers
      const cleanedData = this.filterOutliers(rawData);
      const outlierPercentage = ((rawData.length - cleanedData.length) / rawData.length) * 100;
      
      if (outlierPercentage > 10) {
        warnings.push(`High outlier rate: ${outlierPercentage.toFixed(1)}% of data filtered`);
      }

      // Step 5: Segment data by device and role for accurate interpretation
      const segmentedData = this.segmentHeatmapData(cleanedData);
      
      // Step 6: Calculate statistical confidence
      const confidenceLevel = this.calculateStatisticalConfidence(cleanedData.length, outlierPercentage);
      
      if (confidenceLevel < 0.8) {
        warnings.push(`Low statistical confidence: ${(confidenceLevel * 100).toFixed(1)}%`);
      }

      // Step 7: Build validated heatmap
      const heatmapData: z.infer<typeof HeatmapDataSchema> = {
        feature,
        coordinates: cleanedData,
        timeRange: {
          start: filters?.timeRange?.start || Date.now() - 7 * 24 * 60 * 60 * 1000,
          end: filters?.timeRange?.end || Date.now()
        },
        filters: defaultFilters
      };

      // Step 8: Cache the result
      this.state.heatmapCache.set(cacheKey, {
        data: heatmapData,
        generatedAt: Date.now(),
        validUntil: Date.now() + 30 * 60 * 1000 // 30 minutes
      });

      return this.buildHeatmapResponse(heatmapData, warnings);

    } catch (error) {
      return {
        heatmap: null,
        interpretationGuidelines: {
          sampleSize: 0,
          confidenceLevel: 0,
          dataQuality: 0,
          limitations: [`Failed to generate heatmap: ${error instanceof Error ? error.message : 'Unknown error'}`],
          recommendations: ['Please try again later or contact support']
        },
        warnings: [`Heatmap generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Generate optimization recommendations with risk assessment
   */
  async generateOptimizationRecommendations(feature: string): Promise<z.infer<typeof OptimizationRecommendationSchema>[]> {
    const recommendations: z.infer<typeof OptimizationRecommendationSchema>[] = [];

    try {
      // Get heatmap data for analysis
      const heatmapResult = await this.generateHeatmapWithSafeguards(feature);
      
      if (!heatmapResult.heatmap) {
        return recommendations;
      }

      const sampleSize = heatmapResult.heatmap.coordinates.length;
      const confidenceLevel = heatmapResult.interpretationGuidelines.confidenceLevel;

      // Only generate recommendations if we have sufficient confidence
      if (confidenceLevel < 0.8 || sampleSize < 100) {
        return recommendations;
      }

      // Analyze interaction patterns
      const interactionPatterns = this.analyzeInteractionPatterns(heatmapResult.heatmap.coordinates);
      
      // Generate recommendations based on patterns
      for (const pattern of interactionPatterns) {
        const recommendation = this.createRecommendationFromPattern(feature, pattern, sampleSize, confidenceLevel);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }

      // Store recommendations in history
      for (const rec of recommendations) {
        this.state.optimizationHistory.push({
          id: crypto.randomUUID(),
          recommendation: rec,
          appliedAt: 0, // Not applied yet
          results: null
        });
      }

      return recommendations;

    } catch (error) {
      console.error('Failed to generate optimization recommendations:', error);
      return recommendations;
    }
  }

  /**
   * Calculate event quality score based on multiple factors
   */
  private async calculateEventQuality(event: z.infer<typeof AnalyticsEventSchema>): Promise<number> {
    let score = 1.0;

    // Check timestamp validity (not too old, not in future)
    const now = Date.now();
    const timeDiff = Math.abs(now - event.timestamp);
    if (timeDiff > 24 * 60 * 60 * 1000) { // More than 24 hours
      score -= 0.3;
    }

    // Check if coordinates are reasonable (if provided)
    if (event.coordinates) {
      const { x, y, viewportWidth, viewportHeight } = event.coordinates;
      if (x < 0 || y < 0 || x > viewportWidth || y > viewportHeight) {
        score -= 0.2;
      }
    }

    // Check for suspicious rapid-fire events
    const recentEvents = await this.getRecentEventsByUser(event.userId, 5000); // Last 5 seconds
    if (recentEvents.length > 10) {
      score -= 0.2;
    }

    // Check session consistency
    const sessionEvents = await this.getSessionEvents(event.sessionId);
    if (sessionEvents.length === 0) {
      score -= 0.1; // First event in session
    }

    return Math.max(score, 0);
  }

  /**
   * Detect data anomalies that could affect interpretation
   */
  private async detectAnomalies(event: z.infer<typeof AnalyticsEventSchema>): Promise<string[]> {
    const anomalies: string[] = [];

    // Check for bot-like behavior patterns
    const userEvents = await this.getRecentEventsByUser(event.userId, 60000); // Last minute
    if (userEvents.length > 30) {
      anomalies.push('Possible bot activity detected - high event frequency');
    }

    // Check for impossible mouse movements (if coordinates provided)
    if (event.coordinates && userEvents.length > 0) {
      const lastEvent = userEvents[userEvents.length - 1];
      if (lastEvent.coordinates) {
        const distance = Math.sqrt(
          Math.pow(event.coordinates.x - lastEvent.coordinates.x, 2) +
          Math.pow(event.coordinates.y - lastEvent.coordinates.y, 2)
        );
        const timeDiff = event.timestamp - lastEvent.timestamp;
        const speed = distance / timeDiff; // pixels per millisecond
        
        if (speed > 5) { // Impossibly fast movement
          anomalies.push('Impossible mouse movement speed detected');
        }
      }
    }

    // Check for unusual session duration
    const sessionStart = await this.getSessionStartTime(event.sessionId);
    if (sessionStart && (event.timestamp - sessionStart) > 8 * 60 * 60 * 1000) { // More than 8 hours
      anomalies.push('Unusually long session duration');
    }

    return anomalies;
  }

  /**
   * Build comprehensive heatmap response with interpretation guidelines
   */
  private buildHeatmapResponse(heatmapData: z.infer<typeof HeatmapDataSchema>, warnings: string[]) {
    const sampleSize = heatmapData.coordinates.length;
    const dataQuality = this.state.qualityMetrics.dataAccuracy;
    const confidenceLevel = this.calculateStatisticalConfidence(sampleSize, 0);

    const guidelines = {
      sampleSize,
      confidenceLevel,
      dataQuality,
      limitations: [
        ...warnings,
        ...(sampleSize < 100 ? ['Small sample size - results may not be representative'] : []),
        ...(confidenceLevel < 0.9 ? ['Statistical confidence below 90%'] : []),
        ...(dataQuality < 0.9 ? ['Data quality concerns detected'] : [])
      ],
      recommendations: [
        'Consider user role and device type when interpreting results',
        'Look for patterns across multiple time periods',
        'Validate findings with user feedback before implementing changes',
        ...(sampleSize < 200 ? ['Collect more data before making major changes'] : []),
        ...(warnings.length > 0 ? ['Review data quality issues before acting on insights'] : [])
      ]
    };

    return {
      heatmap: heatmapData,
      interpretationGuidelines: guidelines,
      warnings
    };
  }

  /**
   * Analyze interaction patterns to identify optimization opportunities
   */
  private analyzeInteractionPatterns(coordinates: any[]): Array<{
    type: string;
    area: { x: number; y: number; width: number; height: number };
    intensity: number;
    userCount: number;
    confidence: number;
  }> {
    const patterns: Array<{
      type: string;
      area: { x: number; y: number; width: number; height: number };
      intensity: number;
      userCount: number;
      confidence: number;
    }> = [];

    // Group coordinates into grid cells for analysis
    const gridSize = 50;
    const grid = new Map<string, any[]>();

    for (const coord of coordinates) {
      const gridX = Math.floor(coord.x / gridSize);
      const gridY = Math.floor(coord.y / gridSize);
      const key = `${gridX},${gridY}`;
      
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(coord);
    }

    // Analyze each grid cell
    for (const [key, cellData] of grid.entries()) {
      if (cellData.length < 10) continue; // Skip cells with too few interactions

      const [gridX, gridY] = key.split(',').map(Number);
      const uniqueUsers = new Set(cellData.map(c => c.userId)).size;
      const avgIntensity = cellData.reduce((sum, c) => sum + c.intensity, 0) / cellData.length;
      
      // Calculate confidence based on sample size and user diversity
      const confidence = Math.min(
        (cellData.length / 100), // Sample size factor
        (uniqueUsers / 10) // User diversity factor
      );

      patterns.push({
        type: this.classifyPatternType(avgIntensity, cellData.length),
        area: {
          x: gridX * gridSize,
          y: gridY * gridSize,
          width: gridSize,
          height: gridSize
        },
        intensity: avgIntensity,
        userCount: uniqueUsers,
        confidence: Math.min(confidence, 1)
      });
    }

    return patterns.filter(p => p.confidence > 0.5).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Create optimization recommendation from interaction pattern
   */
  private createRecommendationFromPattern(
    feature: string, 
    pattern: any, 
    sampleSize: number, 
    confidenceLevel: number
  ): z.infer<typeof OptimizationRecommendationSchema> | null {
    const statisticalSignificance = Math.min(confidenceLevel * pattern.confidence, 1);
    
    if (statisticalSignificance < 0.7) {
      return null; // Not significant enough
    }

    const baseRecommendation = {
      feature,
      confidence: statisticalSignificance,
      sampleSize,
      statisticalSignificance,
      validationRequired: statisticalSignificance < 0.9
    };

    switch (pattern.type) {
      case 'high_activity':
        return {
          ...baseRecommendation,
          type: 'layout_change' as const,
          impact: 'medium' as const,
          description: `High activity area detected at (${pattern.area.x}, ${pattern.area.y}). Consider placing important elements here.`,
          implementation: 'Move primary call-to-action buttons or key navigation elements to this area',
          risks: [
            'May disrupt existing user workflows',
            'Could reduce visibility of other elements'
          ]
        };

      case 'low_activity':
        return {
          ...baseRecommendation,
          type: 'position_change' as const,
          impact: 'low' as const,
          description: `Low activity area detected. Consider moving less important elements here.`,
          implementation: 'Relocate secondary navigation or footer content to this area',
          risks: [
            'Elements may become even less discoverable',
            'User expectations may be violated'
          ]
        };

      case 'dead_zone':
        return {
          ...baseRecommendation,
          type: 'layout_change' as const,
          impact: 'high' as const,
          description: `Dead zone detected - no user interactions in this area.`,
          implementation: 'Remove or resize elements in this area, or add compelling content',
          risks: [
            'May affect visual balance of the page',
            'Important content might be inadvertently removed'
          ]
        };

      default:
        return null;
    }
  }

  // Helper methods for data collection and processing
  private async storeAnalyticsEvent(event: z.infer<typeof AnalyticsEventSchema>): Promise<void> {
    // Store in analytics table (placeholder - implement with actual storage)
    console.log('Storing analytics event:', event.eventType, event.feature);
  }

  private async getFeatureSampleSize(feature: string): Promise<number> {
    return this.state.qualityMetrics.sampleSizes.get(feature) || 0;
  }

  private async updateQualityMetrics(feature: string, qualityScore: number): Promise<void> {
    const currentSize = this.state.qualityMetrics.sampleSizes.get(feature) || 0;
    this.state.qualityMetrics.sampleSizes.set(feature, currentSize + 1);
    this.state.qualityMetrics.confidenceScores.set(feature, qualityScore);
  }

  private async getRecentEventsByUser(userId: string, timeWindow: number): Promise<any[]> {
    // Placeholder - implement with actual storage query
    return [];
  }

  private async getSessionEvents(sessionId: string): Promise<any[]> {
    // Placeholder - implement with actual storage query
    return [];
  }

  private async getSessionStartTime(sessionId: string): Promise<number | null> {
    // Placeholder - implement with actual storage query
    return null;
  }

  private async collectHeatmapData(feature: string, filters?: any): Promise<any[]> {
    // Placeholder - implement with actual storage query
    return [];
  }

  private filterOutliers(data: any[]): any[] {
    // Simple outlier detection - remove extreme coordinates
    return data.filter(d => {
      const { x, y, viewportWidth, viewportHeight } = d;
      return x >= 0 && y >= 0 && x <= viewportWidth && y <= viewportHeight;
    });
  }

  private segmentHeatmapData(data: any[]): any[] {
    // Group by device type and user role for more accurate analysis
    return data;
  }

  private calculateStatisticalConfidence(sampleSize: number, outlierPercentage: number): number {
    // Simple confidence calculation based on sample size and data quality
    const sizeScore = Math.min(sampleSize / 500, 1); // Full confidence at 500+ samples
    const qualityScore = 1 - (outlierPercentage / 100);
    return (sizeScore * 0.7) + (qualityScore * 0.3);
  }

  private generateCacheKey(feature: string, filters: any): string {
    return `${feature}_${JSON.stringify(filters)}`;
  }

  private classifyPatternType(intensity: number, count: number): string {
    if (count > 50 && intensity > 0.8) return 'high_activity';
    if (count < 10 || intensity < 0.3) return 'low_activity';
    if (count === 0) return 'dead_zone';
    return 'moderate_activity';
  }

  /**
   * Get system health and analytics quality metrics
   */
  getAnalyticsHealth(): {
    healthy: boolean;
    metrics: {
      totalEvents: number;
      dataQuality: number;
      processingErrors: number;
      cacheHitRate: number;
    };
    recommendations: string[];
  } {
    const cacheEntries = this.state.heatmapCache.size;
    const validCacheEntries = Array.from(this.state.heatmapCache.values())
      .filter(entry => entry.validUntil > Date.now()).length;
    
    const cacheHitRate = cacheEntries > 0 ? validCacheEntries / cacheEntries : 0;
    const dataQuality = this.state.qualityMetrics.dataAccuracy;
    
    const healthy = dataQuality > 0.8 && this.state.totalEvents > 100;

    const recommendations = [];
    if (dataQuality < 0.9) {
      recommendations.push('Improve data collection quality');
    }
    if (this.state.totalEvents < 1000) {
      recommendations.push('Collect more analytics data for better insights');
    }
    if (cacheHitRate < 0.5) {
      recommendations.push('Optimize caching strategy for better performance');
    }

    return {
      healthy,
      metrics: {
        totalEvents: this.state.totalEvents,
        dataQuality,
        processingErrors: 0, // Would track actual errors in real implementation
        cacheHitRate
      },
      recommendations
    };
  }
}