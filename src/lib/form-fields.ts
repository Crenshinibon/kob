import type { RemoteFormField } from '@sveltejs/kit';

/** Spread onto an input. Omits the value when it is unset — remote fields reject `undefined`. */
export function textFieldProps(
	field: RemoteFormField<string>,
	value: string | undefined
): ReturnType<typeof field.as> {
	return value === undefined ? field.as('text') : field.as('text', value);
}
