import { Controller, Post, Body } from '@nestjs/common';
import { StockService } from './stock.service';
import {
  AddStockDto,
  RemoveStockDto,
  TransferStockDto,
} from './dto/stock-operations.dto';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('add')
  add(@Body() dto: AddStockDto) {
    return this.stockService.addStock(dto);
  }

  @Post('remove')
  remove(@Body() dto: RemoveStockDto) {
    return this.stockService.removeStock(dto);
  }

  @Post('transfer')
  transfer(@Body() dto: TransferStockDto) {
    return this.stockService.transferStock(dto);
  }
}
