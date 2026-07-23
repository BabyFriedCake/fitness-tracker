# Figma Make Prompt

Create a mobile workout companion prototype.

## Product

Workout training assistant app.

Reference:

Keep fitness app style.

Goal:

Provide a coach-like workout experience.

## Main Flow

Today

↓

Template Detail

↓

Workout Session

↓

Rest Timer

↓

Workout Complete

## Screen 1: Today

Show:

-   current workout session
-   today's workout plan
-   add workout entry

## Screen 2: Template Detail

Show:

-   workout name
-   exercise list
-   sets
-   reps
-   rest time

Primary button:

Start Workout

## Screen 3: Workout Session

This is the core screen.

Runtime states:

### Running

Show:

-   large exercise image
-   exercise name
-   current set
-   weight
-   rep progress
-   voice coach indicator

Example:

8 / 10

Voice:

"第八次"

Actions:

-   pause
-   complete set

### Paused

Show:

-   pause overlay
-   current progress
-   resume button

### Resting

Show:

-   countdown timer
-   next set information

### Completed

Show:

-   workout summary
-   completed exercises
-   duration

## Design Requirements

-   Mobile first
-   Minimal distraction
-   Large visual hierarchy
-   Fitness coaching feeling
-   Smooth prototype transitions

## Components

Reuse:

-   Exercise Image Card
-   Rep Counter
-   Voice Coach Bubble
-   Rest Timer
-   Workout Controls
