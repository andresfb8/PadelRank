"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRIPE_CONFIG = void 0;
exports.STRIPE_CONFIG = {
    // REEMPLAZAR con los IDs reales de Stripe Dashboard
    products: {
        basic: {
            priceId: "price_1SyENKH0qNNQGErtnwAw3w9R",
            metadataId: "basic"
        },
        pro: {
            priceId: "price_1SyENLH0qNNQGErtnn8H2yK7",
            metadataId: "pro"
        },
        star: {
            priceId: "price_1SyENLH0qNNQGErtanrpSTkh",
            metadataId: "star"
        },
        weekend: {
            priceId: "price_1QuU3dG36W3wUv2p3m7XFvU4",
            amount: 3900,
            metadataId: "weekend"
        }
    },
    webhookSecret: "whsec_REEMPLAZAR_WEBHOOK_SECRET" // Configurar esto en secrets también
};
//# sourceMappingURL=config.js.map