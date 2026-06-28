import { IsString, IsNotEmpty, IsInt, IsPositive } from 'class-validator';

export class AddStockDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}

export class RemoveStockDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}

export class TransferStockDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  fromWarehouseId: string;

  @IsString()
  @IsNotEmpty()
  toWarehouseId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
