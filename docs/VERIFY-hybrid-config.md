# Verification Plan: Hybrid Tournament Configuration

This document outlines the steps to verify the recent changes to the Hybrid Tournament format.

## 1. Hybrid Setup (RankingWizard)
1. Go to "Create Tournament".
2. Select **Ranking Type**: "Grupos + Playoff (Híbrido)".
3. **Step 2 (Configuration)**:
    - Verify that "Num. Grupos" input is visible.
    - Verify "Parejas/Div" (max players per group) input is visible.
    - **CRITICAL**: Verify "Jugadores/parejas que clasifican" input is visible and defaults to 2.
4. **Step 3 (Assignments)**:
    - Verify the header says "Grupos (Parejas Fijas)".
    - Verify the input fields are for **Pairs** (Pareja 1: Jugador A / Jugador B), NOT single players.
    - Test "Distribución Aleatoria" with a list of players. It should create pairs `p1::p2`.
5. **Save**: Click "Crear Torneo".
    - Verify the tournament is created successfully.
    - Verify the resulting View shows "Grupo A", "Grupo B", etc.

## 2. Standings Display (RankingView)
1. Open the newly created Hybrid tournament.
2. Go to "Clasificación" tab.
3. Verify that the "Ascenso/Descenso" column/badges are **GONE**.
4. Verify that the top N pairs (configured in Step 2) have a **Green "Clasificado" (or "Q" label)**.
5. Verify Mobile View shows "Clasificado" instead of "Ascenso".

## 3. Match Generation
1. Go to "Partidos".
2. Verify that matches are generated for **Pairs** (A/B vs C/D), not single players.

## 4. Playoff Transition (Already Verified)
1. Complete all matches.
2. Click "Finalizar Fase de Grupos".
3. Verify bracket is generated without errors.
