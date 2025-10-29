import { TaxBracket, SocialSecurityRule, SupportedCountry } from '../types';

/**
 * Calculates the total annual tax based on a given income and tax brackets.
 * @param annualIncome The total estimated annual income.
 * @param brackets An array of tax brackets.
 * @param annualRebate An optional annual tax rebate amount.
 * @returns The total calculated annual tax after rebates.
 */
export const calculateTax = (annualIncome: number, brackets: TaxBracket[], annualRebate: number = 0): number => {
    if (annualIncome <= 0) {
        return 0;
    }
    
    // For simple flat-rate systems
    if (brackets.length === 1 && brackets[0].from === 0 && brackets[0].to === undefined) {
        const grossTax = annualIncome * brackets[0].rate;
        return Math.max(0, grossTax - annualRebate);
    }
    
    // For progressive, multi-bracket systems
    const applicableBracket = brackets.find(bracket => 
        annualIncome >= bracket.from && (bracket.to === undefined || annualIncome <= bracket.to)
    );

    if (!applicableBracket) {
        // Find the tax-free bracket if income is below the first bracket
        const zeroBracket = brackets.find(b => b.rate === 0 && (b.to === undefined || annualIncome <= b.to));
        if (zeroBracket) return 0;
        
        console.error("No applicable tax bracket found for income:", annualIncome);
        return 0; // Or handle as an error
    }

    const { from, rate, base } = applicableBracket;
    // The taxable amount *within* the current bracket
    const taxableAmountInBracket = annualIncome - (from > 0 ? from - 1 : 0);
    const taxInBracket = taxableAmountInBracket * rate;
    
    const grossAnnualTax = base + taxInBracket;

    return Math.max(0, grossAnnualTax - annualRebate);
};


/**
 * Calculates the social security deduction for a given pay period.
 * @param grossPay The gross earnings for the pay period.
 * @param rule The social security regulation rule.
 * @returns The calculated social security deduction for the period.
 */
export const calculateSocialSecurity = (grossPay: number, rule: SocialSecurityRule): number => {
    if (grossPay <= 0) {
        return 0;
    }
    
    const deduction = grossPay * rule.rate;

    if (rule.maxDeduction && deduction > rule.maxDeduction) {
        return rule.maxDeduction;
    }

    return deduction;
};

/**
 * Formats a number as currency based on the specified country.
 * @param amount The number to format.
 * @param country The country to determine currency and locale.
 * @returns A formatted currency string.
 */
const currencyMap: { [key in SupportedCountry]: string } = {
    'South Africa': 'ZAR',
    'Namibia': 'NAD',
};
const localeMap: { [key in SupportedCountry]: string } = {
    'South Africa': 'en-ZA',
    'Namibia': 'en-NA',
};
export const formatCurrency = (amount: number, country: SupportedCountry): string => {
    const currency = currencyMap[country] || 'USD'; // Fallback to USD
    const locale = localeMap[country] || 'en-US'; // Fallback to en-US
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
};
