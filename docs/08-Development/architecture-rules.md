# Architecture Rules

Version: v1.0  
Status: Approved

## Rule A-001: Domain independence

The domain layer imports no React, React Native, Expo, navigation, or SQLite modules.

## Rule A-002: Repository boundary

Screens do not execute SQL. All durable data access goes through repository implementations.

## Rule A-003: Snapshot integrity

Starting a workout creates Session and SessionExercise snapshots. Later template changes cannot alter them.

## Rule A-004: Set persistence

A completed WorkoutSet is persisted immediately and protected against duplicate insertion.

## Rule A-005: Derivable analytics

Volume, completion rate, PR, trends, and recommendations remain derivable from raw facts. Caches cannot become the sole truth.

## Rule A-006: Timer recovery

Rest timer correctness is based on persisted timestamps and status, not a component interval.

## Rule A-007: One active workout

V1 allows at most one `in_progress` WorkoutSession.

## Rule A-008: Local-first core

Core V1 workflows cannot depend on network services.

## Rule A-009: Dependency direction

```text
Routes/UI → Application → Domain → Repository Interface
                              ↑
                  SQLite Repository Implementation
```

Infrastructure fulfills interfaces; domain code does not know infrastructure.

## Rule A-010: Feature isolation

Features may depend on shared domain and components. They must not import private internals from another feature.

## Rule A-011: No speculative abstraction

Do not create generic frameworks or packages for a single use case. Extract only after real repetition.

## Rule A-012: Explicit state transitions

WorkoutSession and RestTimer transitions must be represented by typed, testable application/domain logic.
