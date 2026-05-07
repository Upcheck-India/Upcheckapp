import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePlanktonDataDto {
    @IsOptional()
    @IsDateString()
    measurementDate?: string;

    @IsOptional()
    @IsString()
    measurementTime?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    greenAlgaeGaCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    blueGreenAlgaeBgaCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    dinoflagellataCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    diatomCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    protozoaCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    flocCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    goldenBrownAlgaeCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    euglenophytaCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    zooCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    haptoyphytaCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    goldenGreenAlgaeCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    yellowGreenAlgaeCellMl?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    otherPlanktonCellMl?: number;
}
