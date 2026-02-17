import { Injectable, BadRequestException } from '@nestjs/common';

export interface PondDimensions {
    lengthM?: number;
    widthM?: number;
    diameterM?: number;
    depthM: number;
    channelCount?: number;
}

export interface DimensionValidationWarning {
    field: string;
    message: string;
}

@Injectable()
export class PondDimensionService {
    // Hard limits — block submission
    private static readonly AREA_MIN = 10;        // m²
    private static readonly AREA_MAX = 50000;      // m²
    private static readonly DEPTH_MIN = 0.5;       // m
    private static readonly DEPTH_MAX = 5.0;       // m

    // Warning thresholds — non-blocking
    private static readonly AREA_WARN = 20000;     // m²
    private static readonly DEPTH_WARN = 3.5;      // m
    private static readonly VOLUME_WARN = 100000;  // m³

    /**
     * Calculate pond area from geometry type and dimensions.
     * Throws BadRequestException for invalid/missing dimensions.
     */
    calculateArea(geometryType: string, dimensions: PondDimensions): number {
        let area: number;

        switch (geometryType) {
            case 'rectangular':
                if (!dimensions.lengthM || !dimensions.widthM) {
                    throw new BadRequestException('Rectangular ponds require length and width');
                }
                area = dimensions.lengthM * dimensions.widthM;
                break;

            case 'circular':
                if (!dimensions.diameterM) {
                    throw new BadRequestException('Circular ponds require diameter');
                }
                area = Math.PI * Math.pow(dimensions.diameterM / 2, 2);
                break;

            case 'raceway':
                if (!dimensions.lengthM || !dimensions.widthM) {
                    throw new BadRequestException('Raceway ponds require length and width');
                }
                const channels = dimensions.channelCount ?? 1;
                area = dimensions.lengthM * dimensions.widthM * channels;
                break;

            case 'irregular':
                // Irregular ponds get their area from satellite tracing (override_area_m2)
                // or manual override. Calculated area defaults to 0.
                area = 0;
                break;

            default:
                throw new BadRequestException(`Unknown geometry type: ${geometryType}`);
        }

        return Math.round(area * 100) / 100; // 2 decimal places
    }

    /**
     * Calculate pond volume from area and depth.
     */
    calculateVolume(areaM2: number, depthM: number): number {
        if (areaM2 <= 0 || depthM <= 0) {
            return 0;
        }
        return Math.round(areaM2 * depthM * 100) / 100;
    }

    /**
     * Validate dimensions against hard limits. Throws on violations.
     */
    validateDimensions(geometryType: string, dimensions: PondDimensions): void {
        if (dimensions.depthM < PondDimensionService.DEPTH_MIN) {
            throw new BadRequestException(`Depth must be at least ${PondDimensionService.DEPTH_MIN}m`);
        }
        if (dimensions.depthM > PondDimensionService.DEPTH_MAX) {
            throw new BadRequestException(`Depth must not exceed ${PondDimensionService.DEPTH_MAX}m`);
        }

        // Validate dimension ranges
        if (dimensions.lengthM !== undefined && dimensions.lengthM !== null) {
            if (dimensions.lengthM < 1 || dimensions.lengthM > 500) {
                throw new BadRequestException('Length must be between 1m and 500m');
            }
        }
        if (dimensions.widthM !== undefined && dimensions.widthM !== null) {
            if (dimensions.widthM < 1 || dimensions.widthM > 500) {
                throw new BadRequestException('Width must be between 1m and 500m');
            }
        }
        if (dimensions.diameterM !== undefined && dimensions.diameterM !== null) {
            if (dimensions.diameterM < 1 || dimensions.diameterM > 400) {
                throw new BadRequestException('Diameter must be between 1m and 400m');
            }
        }

        // Validate computed area
        const area = this.calculateArea(geometryType, dimensions);
        if (area > 0 && area < PondDimensionService.AREA_MIN) {
            throw new BadRequestException(`Calculated area ${area}m² is below minimum of ${PondDimensionService.AREA_MIN}m²`);
        }
        if (area > PondDimensionService.AREA_MAX) {
            throw new BadRequestException(`Calculated area ${area}m² exceeds maximum of ${PondDimensionService.AREA_MAX}m²`);
        }
    }

    /**
     * Get non-blocking warnings for dimensions (e.g. unusually large pond).
     * Warnings are informational — they don't prevent submission.
     */
    getWarnings(areaM2: number, depthM: number): DimensionValidationWarning[] {
        const warnings: DimensionValidationWarning[] = [];

        if (areaM2 > PondDimensionService.AREA_WARN) {
            warnings.push({
                field: 'area',
                message: `Area of ${areaM2}m² is unusually large for a single pond`,
            });
        }

        if (depthM > PondDimensionService.DEPTH_WARN) {
            warnings.push({
                field: 'depth',
                message: `Depth of ${depthM}m may cause DO stratification risks`,
            });
        }

        const volume = this.calculateVolume(areaM2, depthM);
        if (volume > PondDimensionService.VOLUME_WARN) {
            warnings.push({
                field: 'volume',
                message: `Volume of ${volume}m³ is very large — verify dimensions`,
            });
        }

        return warnings;
    }

    /**
     * Check if dimensions have changed between old and new values.
     */
    hasDimensionsChanged(
        oldPond: { lengthM?: number; widthM?: number; diameterM?: number; depthM: number; calculatedAreaM2: number; overrideAreaM2?: number },
        update: Partial<PondDimensions> & { overrideAreaM2?: number },
    ): boolean {
        return (
            (update.lengthM !== undefined && update.lengthM !== oldPond.lengthM) ||
            (update.widthM !== undefined && update.widthM !== oldPond.widthM) ||
            (update.diameterM !== undefined && update.diameterM !== oldPond.diameterM) ||
            (update.depthM !== undefined && update.depthM !== oldPond.depthM) ||
            (update.overrideAreaM2 !== undefined && update.overrideAreaM2 !== oldPond.overrideAreaM2)
        );
    }
}
