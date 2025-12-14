// src/products/entities/sale.entity.ts
export const SaleSchema = {
  name: 'sale',
  columns: {
    id: { primary: true, type: 'int', generated: true },
    product_id: { type: 'int' },
    quantity: { type: 'int' },
    exit_price: { type: 'decimal', precision: 10, scale: 2 },  // Precio real de venta
    notes: { type: 'text', nullable: true },
    created_at: { type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' },
  },
  relations: {
    product: { target: 'product', type: 'many-to-one', joinColumn: true },
  },
};