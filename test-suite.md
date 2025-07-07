# 3D Model Generation System - Test Suite

## Overview

This test suite validates all the implemented features according to the specifications:

1. GPU quota tracking system with daily limits
2. Client-side photo validation with blur/quality detection  
3. Queue management for over-limit requests
4. Version limit system (keep last 5 with archiving)
5. Photo quality warnings UI with traffic light system
6. Generation progress tracking with real TRELLIS stages
7. Multi-photo deletion functionality
8. Photo set organization with automatic creation
9. Archive/restore system for old versions

## Test Points

### 1. GPU Quota System Tests

#### Test 1.1: Basic Quota Tracking
- **Endpoint**: `GET /api/gpu/quota`
- **Expected**: Returns daily limit (31), used count, remaining, reset time
- **Test Steps**:
  1. Call endpoint
  2. Verify response structure matches `GenerationQuota` interface
  3. Verify `dailyLimit` is 31
  4. Verify `remaining` = `dailyLimit` - `used`

#### Test 1.2: Quota Reservation
- **Endpoint**: `POST /api/furniture/generate-3d`
- **Test Cases**:
  - **Within Limit**: Should return `type: 'immediate'`
  - **Over Limit**: Should return `type: 'queued'` with position and estimated time

#### Test 1.3: Queue Processing
- **Endpoint**: Check queue processing functionality
- **Test Steps**:
  1. Exhaust daily quota (make 31+ requests)
  2. Verify subsequent requests are queued
  3. Check queue position accuracy
  4. Verify estimated processing times

### 2. Photo Validation Tests

#### Test 2.1: Blur Detection
- **Function**: `detectBlur()` in `photoValidation.ts`
- **Test Images**:
  - Sharp image (expected score: 7-10)
  - Slightly blurry image (expected score: 4-6)
  - Very blurry image (expected score: 0-3)

#### Test 2.2: Resolution Validation
- **Test Cases**:
  - Image < 512px: Status should be 'poor', `canProceed: false`
  - Image 512-1024px: Status should be 'adequate'
  - Image > 1024px: Status should be 'good'

#### Test 2.3: Lighting Analysis
- **Function**: `analyzeLighting()` in `photoValidation.ts`
- **Test Images**:
  - Well-lit image: 'good'
  - Underexposed image: 'poor'
  - Overexposed image: 'poor'
  - Mixed lighting: 'adequate'

#### Test 2.4: Overall Quality Score
- **Expected Behavior**:
  - Good quality: Overall score ≥ 0.8
  - Warning quality: 0.5 ≤ score < 0.8
  - Poor quality: score < 0.5

### 3. UI Component Tests

#### Test 3.1: PhotoUploader Component
- **Traffic Light System**:
  - 🟢 Green: Good quality photos
  - 🟡 Yellow: Warning quality photos  
  - 🔴 Red: Poor quality photos
- **Auto-selection**: Good quality photos should be pre-selected
- **Bulk Operations**: Select all, deselect all, delete selected

#### Test 3.2: GenerationProgress Component
- **TRELLIS Stages**:
  1. Uploading image (0-6%)
  2. Removing background (6-12%)
  3. Generating 3D model (12-42%)
  4. Extracting GLB file (42-100%)
- **Progress Accuracy**: Each stage should show realistic timing
- **Stage Indicators**: Visual progress through stages

#### Test 3.3: VersionManager Component
- **Version Limits**: Should show 5 active versions max
- **Archive Operations**: Archive/restore functionality
- **Quality Summary**: Display quality statistics

### 4. Version Management Tests

#### Test 4.1: Version Limit Enforcement
- **Endpoint**: `POST /api/furniture/generate-3d` with version checking
- **Test Steps**:
  1. Create 5 versions for an order
  2. Generate 6th version
  3. Verify oldest non-selected version is auto-archived
  4. Verify user notification about archiving

#### Test 4.2: Archive/Restore Operations
- **Endpoints**:
  - `POST /api/versions/{id}/archive`
  - `POST /api/versions/{id}/restore`
- **Test Cases**:
  - Manual archiving
  - Restoring within 90-day window
  - Restoration with version limit handling

#### Test 4.3: Quality-Based Archiving
- **Endpoint**: `POST /api/orders/{id}/versions/cleanup-quality`
- **Test Steps**:
  1. Create versions with varying quality scores
  2. Run cleanup with minQualityScore = 0.3
  3. Verify only low-quality versions are archived

### 5. Queue Management Tests

#### Test 5.1: Queue Status Display
- **Component**: `QueueStatus`
- **Expected Display**:
  - Current quota usage with progress bar
  - Queue position if applicable
  - Estimated processing time
  - Next reset time

#### Test 5.2: Queue Position Tracking
- **Endpoint**: `GET /api/orders/{id}/queue-position`
- **Test Steps**:
  1. Queue multiple requests
  2. Verify accurate position tracking
  3. Check estimated processing times
  4. Verify queue updates as items process

### 6. Photo Set Organization Tests

#### Test 6.1: Automatic Set Creation
- **Endpoint**: `POST /api/furniture/upload-photos/{orderId}`
- **Expected Behavior**:
  - Each upload batch creates new photo set
  - Set name includes upload date
  - Photo count is accurate

#### Test 6.2: Set Management
- **Test Cases**:
  - Renaming photo sets
  - Viewing photos by set
  - Set deletion (moves photos to "Unorganized")

## Integration Tests

### Test 7.1: Complete Generation Workflow
1. Upload photos with quality validation
2. Check GPU quota status
3. Start generation (immediate or queued)
4. Monitor progress through TRELLIS stages
5. Manage resulting versions
6. Archive/restore as needed

### Test 7.2: Quota Exhaustion Scenario
1. Make 31 generation requests in one day
2. Verify 32nd request is queued
3. Check queue position and estimated time
4. Verify queue processes next day

### Test 7.3: Mobile Warning System
- **Test Cases**:
  - Desktop access: Normal flow
  - Mobile access: Warning displayed with option to continue
  - Tablet access: Warning with responsive layout

## Performance Tests

### Test 8.1: Photo Validation Performance
- **Target**: Validate photos in <5 seconds each
- **Test**: Upload 5 high-resolution photos simultaneously
- **Expected**: All validations complete within 25 seconds total

### Test 8.2: Queue Processing Efficiency
- **Target**: Process queue items within estimated times
- **Test**: Full queue of 31 items
- **Expected**: Complete processing within 48 minutes

### Test 8.3: Version Management Scalability
- **Test**: Orders with many generations
- **Expected**: Archive operations complete in <2 seconds

## Error Handling Tests

### Test 9.1: Failed Photo Upload
- **Test Cases**:
  - Unsupported file format
  - File size too large (>10MB)
  - Corrupted image files
  - Network interruption during upload

### Test 9.2: Generation Failures
- **Test Cases**:
  - TRELLIS service unavailable
  - Invalid photo data
  - GPU processing errors
  - Network timeouts

### Test 9.3: Database Failures
- **Test Cases**:
  - Connection loss during operations
  - Quota service unavailable
  - Version service errors

## Test Data Requirements

### Sample Images
1. **High Quality (Score: 0.9)**:
   - Resolution: 2048x2048
   - Sharp focus
   - Good lighting
   - Clear furniture visibility

2. **Medium Quality (Score: 0.6)**:
   - Resolution: 1024x1024
   - Slight blur
   - Adequate lighting
   - Some shadow issues

3. **Poor Quality (Score: 0.3)**:
   - Resolution: 512x512
   - Heavy blur
   - Poor lighting
   - Low furniture visibility

4. **Blocked Quality (Score: 0.1)**:
   - Resolution: 256x256
   - Extreme blur
   - Very dark/overexposed
   - Furniture barely visible

### Test Orders
- Orders with 0-10 generation attempts
- Orders with mixed quality versions
- Orders with queued generations
- Orders with archived versions

## Expected Results Summary

All tests should pass with the following success criteria:

✅ **GPU Quota System**: 
- Accurate tracking and enforcement
- Proper queue management
- Realistic time estimates

✅ **Photo Validation**: 
- Accurate quality detection
- Appropriate user warnings
- Performance within targets

✅ **Version Management**: 
- Automatic archiving at 5-version limit
- Successful archive/restore operations
- Quality-based cleanup

✅ **User Experience**: 
- Intuitive traffic light system
- Smooth progress tracking
- Responsive bulk operations

✅ **System Reliability**: 
- Graceful error handling
- Data consistency
- Performance targets met

## Running the Tests

### Prerequisites
1. Database with test data
2. TRELLIS service configured
3. Sample images prepared
4. Test user accounts

### Automated Tests
```bash
# API Tests
npm run test:api

# Component Tests  
npm run test:components

# Integration Tests
npm run test:integration

# Performance Tests
npm run test:performance
```

### Manual Tests
1. Load test environment
2. Follow test steps in order
3. Record results
4. Compare with expected outcomes
5. Report any deviations

## Success Metrics

- ✅ All automated tests pass
- ✅ Manual test scenarios complete successfully  
- ✅ Performance benchmarks met
- ✅ Error handling validates gracefully
- ✅ User experience flows smoothly
- ✅ Data integrity maintained throughout