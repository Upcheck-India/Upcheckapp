import { Crop } from '../crops/crop.entity';
export declare class PlanktonData {
    id: string;
    cropId: string;
    crop: Crop;
    measurementDate: Date;
    measurementTime: string;
    greenAlgaeGaCellMl: number;
    blueGreenAlgaeBgaCellMl: number;
    dinoflagellataCellMl: number;
    diatomCellMl: number;
    protozoaCellMl: number;
    flocCellMl: number;
    goldenBrownAlgaeCellMl: number;
    euglenophytaCellMl: number;
    zooCellMl: number;
    haptoyphytaCellMl: number;
    goldenGreenAlgaeCellMl: number;
    yellowGreenAlgaeCellMl: number;
    otherPlanktonCellMl: number;
    totalPlanktonCellMl: number;
    createdAt: Date;
}
