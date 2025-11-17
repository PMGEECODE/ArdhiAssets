#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>
#include <json-c/json.h>
#include <assert.h>

/* Forward declarations of functions from financial_calculator.c */
char* calculate_asset_depreciation(
    const char* asset_id,
    double purchase_amount,
    double depreciation_rate,
    time_t purchase_date,
    time_t disposal_date,
    double disposal_value
);

char* process_batch_depreciation(const char* assets_json_str);

/**
 * Test 1: Basic depreciation calculation
 */
void test_basic_depreciation() {
    printf("Test 1: Basic depreciation calculation...\n");
    
    time_t now = time(NULL);
    time_t purchase_date = now - (100 * 86400);  // 100 days ago
    
    char* result = calculate_asset_depreciation(
        "TEST-001",
        10000.0,    // $10,000
        10.0,       // 10% annual depreciation
        purchase_date,
        0,          // no disposal
        0           // no disposal value
    );
    
    json_object *result_obj = json_tokener_parse(result);
    assert(json_object_object_get(result_obj, "error") == NULL);
    
    double nbv = json_object_get_double(json_object_object_get(result_obj, "net_book_value"));
    assert(nbv > 0 && nbv < 10000);  // NBV should be between 0 and purchase amount
    
    printf("  ✓ Basic depreciation passed (NBV: %.2f)\n", nbv);
    
    free(result);
    json_object_put(result_obj);
}

/**
 * Test 2: Disposed asset
 */
void test_disposed_asset() {
    printf("Test 2: Disposed asset...\n");
    
    time_t now = time(NULL);
    time_t purchase_date = now - (365 * 86400);  // 1 year ago
    time_t disposal_date = now - (100 * 86400);  // 100 days ago
    
    char* result = calculate_asset_depreciation(
        "TEST-002",
        10000.0,
        10.0,
        purchase_date,
        disposal_date,
        5000.0      // Disposed at $5,000
    );
    
    json_object *result_obj = json_tokener_parse(result);
    assert(json_object_object_get(result_obj, "error") == NULL);
    
    const char* status = json_object_get_string(json_object_object_get(result_obj, "status"));
    assert(strcmp(status, "DISPOSED") == 0);
    
    double nbv = json_object_get_double(json_object_object_get(result_obj, "net_book_value"));
    assert(nbv == 5000.0);  // NBV should match disposal value
    
    printf("  ✓ Disposed asset passed (Status: %s, NBV: %.2f)\n", status, nbv);
    
    free(result);
    json_object_put(result_obj);
}

/**
 * Test 3: Invalid purchase amount
 */
void test_invalid_purchase_amount() {
    printf("Test 3: Invalid purchase amount...\n");
    
    time_t now = time(NULL);
    char* result = calculate_asset_depreciation(
        "TEST-003",
        -1000.0,    // Negative amount (invalid)
        10.0,
        now,
        0,
        0
    );
    
    json_object *result_obj = json_tokener_parse(result);
    assert(json_object_object_get(result_obj, "error") != NULL);
    
    printf("  ✓ Invalid purchase amount rejected\n");
    
    free(result);
    json_object_put(result_obj);
}

/**
 * Test 4: Invalid depreciation rate
 */
void test_invalid_depreciation_rate() {
    printf("Test 4: Invalid depreciation rate...\n");
    
    time_t now = time(NULL);
    char* result = calculate_asset_depreciation(
        "TEST-004",
        10000.0,
        150.0,      // Rate > 100 (invalid)
        now,
        0,
        0
    );
    
    json_object *result_obj = json_tokener_parse(result);
    assert(json_object_object_get(result_obj, "error") != NULL);
    
    printf("  ✓ Invalid depreciation rate rejected\n");
    
    free(result);
    json_object_put(result_obj);
}

/**
 * Test 5: Batch processing
 */
void test_batch_processing() {
    printf("Test 5: Batch processing...\n");
    
    time_t now = time(NULL);
    time_t purchase_1 = now - (100 * 86400);
    time_t purchase_2 = now - (200 * 86400);
    
    char batch_json[1024];
    snprintf(batch_json, sizeof(batch_json),
        "[{\"id\":\"ASSET-1\",\"purchase_amount\":10000,\"depreciation_rate\":10,"
        "\"purchase_date\":%ld,\"disposal_date\":0,\"disposal_value\":0},"
        "{\"id\":\"ASSET-2\",\"purchase_amount\":20000,\"depreciation_rate\":5,"
        "\"purchase_date\":%ld,\"disposal_date\":0,\"disposal_value\":0}]",
        purchase_1, purchase_2
    );
    
    char* result = process_batch_depreciation(batch_json);
    json_object *result_obj = json_tokener_parse(result);
    
    int processed = json_object_get_int(json_object_object_get(result_obj, "processed_count"));
    assert(processed == 2);
    
    json_object *assets = json_object_object_get(result_obj, "assets");
    assert(json_object_array_length(assets) == 2);
    
    printf("  ✓ Batch processing passed (%d assets processed)\n", processed);
    
    free(result);
    json_object_put(result_obj);
}

/**
 * Test 6: Depreciation doesn't exceed purchase amount
 */
void test_accumulated_depreciation_cap() {
    printf("Test 6: Accumulated depreciation cap...\n");
    
    time_t now = time(NULL);
    time_t purchase_date = now - (3650 * 86400);  // 10 years ago
    
    char* result = calculate_asset_depreciation(
        "TEST-006",
        10000.0,
        50.0,       // 50% annual depreciation (high rate)
        purchase_date,
        0,
        0
    );
    
    json_object *result_obj = json_tokener_parse(result);
    double accumulated = json_object_get_double(json_object_object_get(result_obj, "accumulated_depreciation"));
    assert(accumulated <= 10000.0);
    
    double nbv = json_object_get_double(json_object_object_get(result_obj, "net_book_value"));
    assert(nbv >= 0);
    
    printf("  ✓ Depreciation cap enforced (NBV: %.2f)\n", nbv);
    
    free(result);
    json_object_put(result_obj);
}

/**
 * Test 7: Zero depreciation rate for non-depreciating assets
 */
void test_zero_depreciation() {
    printf("Test 7: Zero depreciation rate (land)...\n");
    
    time_t now = time(NULL);
    time_t purchase_date = now - (100 * 86400);
    
    char* result = calculate_asset_depreciation(
        "TEST-007",
        50000.0,    // Land value
        0.0,        // No depreciation
        purchase_date,
        0,
        0
    );
    
    json_object *result_obj = json_tokener_parse(result);
    double nbv = json_object_get_double(json_object_object_get(result_obj, "net_book_value"));
    assert(nbv == 50000.0);  // NBV should equal purchase amount
    
    printf("  ✓ Zero depreciation handled (NBV: %.2f)\n", nbv);
    
    free(result);
    json_object_put(result_obj);
}

/**
 * Main test runner
 */
int main() {
    printf("\n====================================\n");
    printf("Financial Calculator Test Suite\n");
    printf("====================================\n\n");
    
    test_basic_depreciation();
    test_disposed_asset();
    test_invalid_purchase_amount();
    test_invalid_depreciation_rate();
    test_batch_processing();
    test_accumulated_depreciation_cap();
    test_zero_depreciation();
    
    printf("\n====================================\n");
    printf("✓ All C tests passed!\n");
    printf("====================================\n\n");
    
    return 0;
}
