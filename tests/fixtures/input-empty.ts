// Empty input fixture for testing
export const emptyInputFixture = {
  description: "",
  location: "",
  deviceType: "",
  attachments: []
};

// Expected result structure for empty input
export const expectedEmptyResult = {
  error: {
    code: "VALIDATION_ERROR",
    message: "Description is required"
  }
};