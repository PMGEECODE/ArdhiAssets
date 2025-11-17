#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>
#include <json-c/json.h>

#define MAX_ASSETS 10000
#define MAX_ASSET_ID 36  // UUID length
#define DAYS_PER_YEAR 365.25  // Account for leap years

/**
 * Asset Financial Data Structure
 */
typedef struct {
    char id[MAX_ASSET_ID];
    char asset_type[50];
    double purchase_amount;
    double depreciation_rate;
    time_t purchase_date;
    time_t disposal_date;
    double disposal_value;
    double current_nbv;  // For validation

    // Calculated values
    double annual_depreciation;
    double accumulated_depreciation;
    double net_book_value;
    int days_in_use;
} AssetFinancial;

/**
 * Calculate days between two dates
 */
int calculate_days_between(time_t start, time_t end) {
    if (start <= 0 || end <= 0) return 0;
    return (int)((end - start) / 86400);
}

/**
 * Validate asset data before calculation
 * Returns NULL if valid, error message if invalid
 */
const char* validate_asset_data(
    const char* asset_id,
    double purchase_amount,
    double depreciation_rate
) {
    if (!asset_id || strlen(asset_id) == 0) {
        return "Missing asset ID";
    }
    if (purchase_amount < 0) {
        return "Purchase amount cannot be negative";
    }
    if (purchase_amount == 0) {
        return "Purchase amount must be greater than zero";
    }
    if (depreciation_rate < 0 || depreciation_rate > 100) {
        return "Depreciation rate must be between 0 and 100";
    }
    return NULL;
}

/**
 * Calculate financial metrics for a single asset
 * Returns a heap-allocated JSON string with calculated values
 * Now validates input, handles edge cases, and uses real-time current date
 */
char* calculate_asset_depreciation(
    const char* asset_id,
    double purchase_amount,
    double depreciation_rate,
    time_t purchase_date,
    time_t disposal_date,
    double disposal_value
) {
    json_object *result = json_object_new_object();

    const char* validation_error = validate_asset_data(asset_id, purchase_amount, depreciation_rate);
    if (validation_error) {
        json_object_object_add(result, "error", json_object_new_string(validation_error));
        json_object_object_add(result, "asset_id", json_object_new_string(asset_id));
        const char *json_str = json_object_to_json_string(result);
        char *ret = strdup(json_str);
        json_object_put(result);
        return ret;
    }

    time_t current_time = time(NULL);

    if (purchase_date <= 0 || purchase_date > current_time) {
        json_object *error_result = json_object_new_object();
        json_object_object_add(error_result, "error", json_object_new_string("Invalid purchase date"));
        json_object_object_add(error_result, "asset_id", json_object_new_string(asset_id));
        const char *json_str = json_object_to_json_string(error_result);
        char *ret = strdup(json_str);
        json_object_put(error_result);
        return ret;
    }

    // Disposed asset case
    if (disposal_date > 0 && disposal_date <= current_time) {
        if (disposal_value < 0 || disposal_value > purchase_amount) {
            json_object *error_result = json_object_new_object();
            json_object_object_add(error_result, "error", 
                                   json_object_new_string("Invalid disposal value"));
            json_object_object_add(error_result, "asset_id", json_object_new_string(asset_id));
            const char *json_str = json_object_to_json_string(error_result);
            char *ret = strdup(json_str);
            json_object_put(error_result);
            return ret;
        }

        json_object_object_add(result, "asset_id", json_object_new_string(asset_id));
        json_object_object_add(result, "status", json_object_new_string("DISPOSED"));
        json_object_object_add(result, "net_book_value", json_object_new_double(disposal_value));
        json_object_object_add(result, "accumulated_depreciation",
                               json_object_new_double(purchase_amount - disposal_value));
        json_object_object_add(result, "annual_depreciation", json_object_new_double(0));
        json_object_object_add(result, "disposal_value", json_object_new_double(disposal_value));
        json_object_object_add(result, "disposal_date", json_object_new_int64((long long)disposal_date));
    } else {
        // Active asset case
        double annual_depreciation = (purchase_amount * depreciation_rate) / 100.0;
        int days_in_use = calculate_days_between(purchase_date, current_time);

        if (days_in_use < 0) {
            json_object *error_result = json_object_new_object();
            json_object_object_add(error_result, "error", 
                                   json_object_new_string("Purchase date is in the future"));
            json_object_object_add(error_result, "asset_id", json_object_new_string(asset_id));
            const char *json_str = json_object_to_json_string(error_result);
            char *ret = strdup(json_str);
            json_object_put(error_result);
            return ret;
        }

        if (days_in_use == 0) {
            days_in_use = 1;  // At least 1 day of depreciation
        }

        double daily_depreciation = annual_depreciation / DAYS_PER_YEAR;
        double accumulated_depreciation = daily_depreciation * days_in_use;

        // Cap accumulated depreciation at purchase amount
        if (accumulated_depreciation > purchase_amount) {
            accumulated_depreciation = purchase_amount;
        }

        double net_book_value = purchase_amount - accumulated_depreciation;
        if (net_book_value < 0) {
            net_book_value = 0;
        }

        json_object_object_add(result, "asset_id", json_object_new_string(asset_id));
        json_object_object_add(result, "status", json_object_new_string("ACTIVE"));
        json_object_object_add(result, "days_in_use", json_object_new_int(days_in_use));
        json_object_object_add(result, "annual_depreciation",
                               json_object_new_double(round(annual_depreciation * 100) / 100));
        json_object_object_add(result, "accumulated_depreciation",
                               json_object_new_double(round(accumulated_depreciation * 100) / 100));
        json_object_object_add(result, "net_book_value",
                               json_object_new_double(round(net_book_value * 100) / 100));
    }

    // Common fields
    json_object_object_add(result, "purchase_amount", json_object_new_double(purchase_amount));
    json_object_object_add(result, "depreciation_rate", json_object_new_double(depreciation_rate));
    json_object_object_add(result, "calculation_timestamp", json_object_new_int64((long long)current_time));

    const char *json_str = json_object_to_json_string(result);
    char *ret = strdup(json_str);
    json_object_put(result);
    return ret;
}

/**
 * Process batch of assets and return JSON results
 * Removed hardcoded test data, now processes all input from caller
 */
char* process_batch_depreciation(const char* assets_json_str) {
    json_object *assets_json = json_tokener_parse(assets_json_str);

    // Validate top-level input type
    if (!json_object_is_type(assets_json, json_type_array)) {
        json_object *error_obj = json_object_new_object();
        json_object_object_add(error_obj, "error",
                               json_object_new_string("Invalid input: expected array of assets"));
        const char *json_str = json_object_to_json_string(error_obj);
        char *ret = strdup(json_str);
        json_object_put(error_obj);
        if (assets_json) json_object_put(assets_json);
        return ret;
    }

    int array_len = json_object_array_length(assets_json);
    json_object *response = json_object_new_object();
    json_object *assets_array = json_object_new_array();
    int error_count = 0;

    for (int i = 0; i < array_len; i++) {
        json_object *asset = json_object_array_get_idx(assets_json, i);

        const char *asset_id = json_object_get_string(json_object_object_get(asset, "id"));
        double purchase_amount = json_object_get_double(json_object_object_get(asset, "purchase_amount"));
        double depreciation_rate = json_object_get_double(json_object_object_get(asset, "depreciation_rate"));
        long purchase_timestamp = json_object_get_int64(json_object_object_get(asset, "purchase_date"));
        long disposal_timestamp = json_object_get_int64(json_object_object_get(asset, "disposal_date"));
        double disposal_value = json_object_get_double(json_object_object_get(asset, "disposal_value"));

        char *result_str = calculate_asset_depreciation(
            asset_id ? asset_id : "unknown",
            purchase_amount,
            depreciation_rate,
            (time_t)purchase_timestamp,
            (time_t)disposal_timestamp,
            disposal_value
        );

        json_object *result_obj = json_tokener_parse(result_str);
        json_object_array_add(assets_array, result_obj);
        free(result_str);

        if (json_object_object_get(result_obj, "error")) {
            error_count++;
        }
    }

    json_object_object_add(response, "assets", assets_array);
    json_object_object_add(response, "processed_count", json_object_new_int(array_len));
    json_object_object_add(response, "error_count", json_object_new_int(error_count));
    json_object_object_add(response, "success_count", json_object_new_int(array_len - error_count));
    json_object_object_add(response, "timestamp", json_object_new_int64((long long)time(NULL)));

    const char *json_str = json_object_to_json_string(response);
    char *ret = strdup(json_str);
    json_object_put(response);
    if (assets_json) json_object_put(assets_json);
    return ret;
}

/**
 * Main entry — reads from stdin
 * Now reads JSON from stdin instead of using hardcoded test data
 */
int main() {
    char buffer[1024 * 1024];  // 1MB buffer for JSON input
    size_t bytes_read = 0;
    int c;

    // Read JSON from stdin
    while ((c = getchar()) != EOF && bytes_read < sizeof(buffer) - 1) {
        buffer[bytes_read++] = (char)c;
    }
    buffer[bytes_read] = '\0';

    if (bytes_read == 0) {
        json_object *error_obj = json_object_new_object();
        json_object_object_add(error_obj, "error", 
                               json_object_new_string("No input provided"));
        printf("%s\n", json_object_to_json_string(error_obj));
        json_object_put(error_obj);
        return 1;
    }

    char *output = process_batch_depreciation(buffer);
    printf("%s\n", output);
    free(output);

    return 0;
}
