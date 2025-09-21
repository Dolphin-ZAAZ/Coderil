# Python Code Kata Template

This template provides a starting structure for creating Python code katas.

## Usage

1. Copy this entire directory to `katas/your-kata-name/`
2. Update `meta.yaml` with your kata details
3. Write the problem description in `statement.md`
4. Define the function signature and docstring in `entry.py`
5. Create comprehensive test cases in `tests.py` (public tests)
6. Add challenging test cases in `hidden_tests.py` (private tests)
7. Test your kata by running the application

## Files

- `meta.yaml` - Kata metadata and configuration
- `statement.md` - Problem description shown to users
- `entry.py` - Starter code with function signature
- `tests.py` - Public test cases (visible to users)
- `hidden_tests.py` - Hidden test cases (for final evaluation)

## Testing

Make sure to test your kata thoroughly:
- Verify the correct solution passes all tests
- Test with incorrect solutions to ensure proper error messages
- Check edge cases and boundary conditions
- Ensure timeout settings are appropriate

For detailed guidance, see the [Kata Authoring Guide](../../KATA_AUTHORING.md).