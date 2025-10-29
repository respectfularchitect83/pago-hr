import { RegulationMap } from "../types";

export const countryRegulations: RegulationMap = {
  'Namibia': {
    tax: { 
        description: 'Income Tax (PAYE est.)', 
        brackets: [
            { from: 0, to: 100000, rate: 0, base: 0 },
            { from: 100001, to: 150000, rate: 0.18, base: 0 },
            { from: 150001, to: 350000, rate: 0.25, base: 9000 },
            { from: 350001, to: 550000, rate: 0.28, base: 59000 },
            { from: 550001, to: 850000, rate: 0.30, base: 115000 },
            { from: 850001, to: 1550000, rate: 0.32, base: 205000 },
            { from: 1550001, rate: 0.37, base: 429000 },
        ]
    },
    socialSecurity: { 
        description: 'SSC Contribution', 
        rate: 0.009, // 0.9%
        maxDeduction: 99.00
    },
  },
  'South Africa': {
    tax: { 
        description: 'Income Tax (PAYE est.)',
        annualRebate: 17235,
        brackets: [
            { from: 0, to: 237100, rate: 0.18, base: 0 },
            { from: 237101, to: 370500, rate: 0.26, base: 42678 },
            { from: 370501, to: 512800, rate: 0.31, base: 77362 },
            { from: 512801, to: 673000, rate: 0.36, base: 121475 },
            { from: 673001, to: 857900, rate: 0.39, base: 179147 },
            { from: 857901, to: 1817000, rate: 0.41, base: 251258 },
            { from: 1817001, rate: 0.45, base: 644489 },
        ]
    },
    socialSecurity: { 
        description: 'UIF Contribution', 
        rate: 0.01,
        maxDeduction: 177.12,
    },
  }
};