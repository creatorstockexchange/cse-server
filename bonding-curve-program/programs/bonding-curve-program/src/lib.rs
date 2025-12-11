use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("24GqRtqWAoSqNvEmBtSvdRzTmU9F7dzKRSUfiebxZnye");

#[program]
pub mod token_bonding_curve {
    use super::*;

    /// Initialize a new creator token with bonding curve parameters
    pub fn initialize_creator_token(
        ctx: Context<InitializeCreatorToken>,
        creator_id: u64,
        slope: u64,           // Price increase per token (in lamports)
        initial_price: u64,   // Starting price (in lamports)
        reserve_ratio: u16,   // Reserve ratio in basis points (e.g., 5000 = 50%)
    ) -> Result<()> {
        let bonding_curve = &mut ctx.accounts.bonding_curve;
        
        bonding_curve.creator = ctx.accounts.creator.key();
        bonding_curve.creator_id = creator_id;
        bonding_curve.token_mint = ctx.accounts.token_mint.key();
        bonding_curve.reserve_vault = ctx.accounts.reserve_vault.key();
        bonding_curve.slope = slope;
        bonding_curve.initial_price = initial_price;
        bonding_curve.reserve_ratio = reserve_ratio;
        bonding_curve.current_supply = 0;
        bonding_curve.total_reserve = 0;
        bonding_curve.bump = ctx.bumps.bonding_curve;

        msg!("Creator token initialized with ID: {}", creator_id);
        Ok(())
    }

    /// Buy creator tokens using SOL
    /// Uses linear bonding curve: price = initial_price + (slope * current_supply)
    pub fn buy_tokens(
        ctx: Context<BuyTokens>,
        amount: u64,
    ) -> Result<()> {
        let bonding_curve = &mut ctx.accounts.bonding_curve;
        
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Calculate cost using integral of linear bonding curve
        // Cost = initial_price * amount + slope * (current_supply * amount + amount^2/2)
        let current_supply = bonding_curve.current_supply;
        let cost = calculate_buy_cost(
            amount,
            current_supply,
            bonding_curve.initial_price,
            bonding_curve.slope,
        )?;

        // Transfer SOL from buyer to reserve vault
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.reserve_vault.key(),
            cost,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.reserve_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Mint tokens to buyer
        let seeds = &[
            b"bonding_curve",
            bonding_curve.creator_id.to_le_bytes().as_ref(),
            &[bonding_curve.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer,
        );
        token::mint_to(cpi_ctx, amount)?;

        // Update state
        bonding_curve.current_supply = bonding_curve
            .current_supply
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        bonding_curve.total_reserve = bonding_curve
            .total_reserve
            .checked_add(cost)
            .ok_or(ErrorCode::Overflow)?;

        emit!(TokenPurchased {
            buyer: ctx.accounts.buyer.key(),
            amount,
            cost,
            new_supply: bonding_curve.current_supply,
        });

        Ok(())
    }

    /// Sell creator tokens back for SOL
    pub fn sell_tokens(
        ctx: Context<SellTokens>,
        amount: u64,
    ) -> Result<()> {
        let bonding_curve = &mut ctx.accounts.bonding_curve;
        
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(
            amount <= bonding_curve.current_supply,
            ErrorCode::InsufficientSupply
        );

        // Calculate refund using integral of linear bonding curve
        let new_supply = bonding_curve.current_supply - amount;
        let refund = calculate_sell_refund(
            amount,
            bonding_curve.current_supply,
            bonding_curve.initial_price,
            bonding_curve.slope,
        )?;

        // Apply reserve ratio (protocol keeps a percentage)
        let refund_after_fee = refund
            .checked_mul(bonding_curve.reserve_ratio as u64)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::Overflow)?;

        require!(
            refund_after_fee <= bonding_curve.total_reserve,
            ErrorCode::InsufficientReserve
        );

        // Burn tokens from seller
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.seller_token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        );
        token::burn(cpi_ctx, amount)?;

        // Transfer SOL from reserve vault to seller
        **ctx.accounts.reserve_vault.try_borrow_mut_lamports()? -= refund_after_fee;
        **ctx.accounts.seller.try_borrow_mut_lamports()? += refund_after_fee;

        // Update state
        bonding_curve.current_supply = new_supply;
        bonding_curve.total_reserve = bonding_curve
            .total_reserve
            .checked_sub(refund_after_fee)
            .ok_or(ErrorCode::Overflow)?;

        emit!(TokenSold {
            seller: ctx.accounts.seller.key(),
            amount,
            refund: refund_after_fee,
            new_supply: bonding_curve.current_supply,
        });

        Ok(())
    }

    /// Withdraw accumulated fees (creator only)
    pub fn withdraw_fees(
        ctx: Context<WithdrawFees>,
        amount: u64,
    ) -> Result<()> {
        let bonding_curve = &ctx.accounts.bonding_curve;
        
        require!(
            ctx.accounts.creator.key() == bonding_curve.creator,
            ErrorCode::Unauthorized
        );

        let available_fees = bonding_curve
            .total_reserve
            .checked_sub(calculate_minimum_reserve(
                bonding_curve.current_supply,
                bonding_curve.initial_price,
                bonding_curve.slope,
            )?)
            .ok_or(ErrorCode::InsufficientReserve)?;

        require!(amount <= available_fees, ErrorCode::InsufficientFees);

        // Transfer SOL to creator
        **ctx.accounts.reserve_vault.try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.creator.try_borrow_mut_lamports()? += amount;

        emit!(FeesWithdrawn {
            creator: ctx.accounts.creator.key(),
            amount,
        });

        Ok(())
    }
}

// Helper functions for bonding curve calculations

/// Calculate cost to buy tokens using linear bonding curve
/// Cost = sum of prices from current_supply to (current_supply + amount)
fn calculate_buy_cost(
    amount: u64,
    current_supply: u64,
    initial_price: u64,
    slope: u64,
) -> Result<u64> {
    // Using integral: cost = initial_price * amount + slope * (current_supply * amount + amount * (amount - 1) / 2)
    let base_cost = initial_price
        .checked_mul(amount)
        .ok_or(ErrorCode::Overflow)?;
    
    let linear_term = slope
        .checked_mul(current_supply)
        .ok_or(ErrorCode::Overflow)?
        .checked_mul(amount)
        .ok_or(ErrorCode::Overflow)?;
    
    let quadratic_term = slope
        .checked_mul(amount)
        .ok_or(ErrorCode::Overflow)?
        .checked_mul(amount.checked_sub(1).unwrap_or(0))
        .ok_or(ErrorCode::Overflow)?
        .checked_div(2)
        .ok_or(ErrorCode::Overflow)?;
    
    base_cost
        .checked_add(linear_term)
        .ok_or(ErrorCode::Overflow)?
        .checked_add(quadratic_term)
        .ok_or(ErrorCode::Overflow)
        .map_err(|_| ErrorCode::Overflow.into())
}

/// Calculate refund for selling tokens
fn calculate_sell_refund(
    amount: u64,
    current_supply: u64,
    initial_price: u64,
    slope: u64,
) -> Result<u64> {
    let new_supply = current_supply.checked_sub(amount).ok_or(ErrorCode::Overflow)?;
    calculate_buy_cost(amount, new_supply, initial_price, slope)
}

/// Calculate minimum reserve needed to back current supply
fn calculate_minimum_reserve(
    current_supply: u64,
    initial_price: u64,
    slope: u64,
) -> Result<u64> {
    calculate_buy_cost(current_supply, 0, initial_price, slope)
}

// Context structs

#[derive(Accounts)]
#[instruction(creator_id: u64)]
pub struct InitializeCreatorToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 9,
        mint::authority = bonding_curve,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [b"bonding_curve", creator_id.to_le_bytes().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// CHECK: PDA used as reserve vault
    #[account(
        mut,
        seeds = [b"reserve", creator_id.to_le_bytes().as_ref()],
        bump
    )]
    pub reserve_vault: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.creator_id.to_le_bytes().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// CHECK: Reserve vault PDA
    #[account(
        mut,
        seeds = [b"reserve", bonding_curve.creator_id.to_le_bytes().as_ref()],
        bump
    )]
    pub reserve_vault: AccountInfo<'info>,

    #[account(
        mut,
        constraint = buyer_token_account.mint == token_mint.key(),
        constraint = buyer_token_account.owner == buyer.key()
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(mut)]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.creator_id.to_le_bytes().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// CHECK: Reserve vault PDA
    #[account(
        mut,
        seeds = [b"reserve", bonding_curve.creator_id.to_le_bytes().as_ref()],
        bump
    )]
    pub reserve_vault: AccountInfo<'info>,

    #[account(
        mut,
        constraint = seller_token_account.mint == token_mint.key(),
        constraint = seller_token_account.owner == seller.key()
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds = [b"bonding_curve", bonding_curve.creator_id.to_le_bytes().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// CHECK: Reserve vault PDA
    #[account(
        mut,
        seeds = [b"reserve", bonding_curve.creator_id.to_le_bytes().as_ref()],
        bump
    )]
    pub reserve_vault: AccountInfo<'info>,
}

// State structs

#[account]
#[derive(InitSpace)]
pub struct BondingCurve {
    pub creator: Pubkey,
    pub creator_id: u64,
    pub token_mint: Pubkey,
    pub reserve_vault: Pubkey,
    pub slope: u64,              // Price increase per token
    pub initial_price: u64,      // Starting price
    pub reserve_ratio: u16,      // Percentage kept in reserve (basis points)
    pub current_supply: u64,     // Current circulating supply
    pub total_reserve: u64,      // Total SOL in reserve
    pub bump: u8,
}

// Events

#[event]
pub struct TokenPurchased {
    pub buyer: Pubkey,
    pub amount: u64,
    pub cost: u64,
    pub new_supply: u64,
}

#[event]
pub struct TokenSold {
    pub seller: Pubkey,
    pub amount: u64,
    pub refund: u64,
    pub new_supply: u64,
}

#[event]
pub struct FeesWithdrawn {
    pub creator: Pubkey,
    pub amount: u64,
}

// Errors

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount provided")]
    InvalidAmount,
    #[msg("Insufficient token supply")]
    InsufficientSupply,
    #[msg("Insufficient reserve balance")]
    InsufficientReserve,
    #[msg("Insufficient fees available")]
    InsufficientFees,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    Overflow,
}