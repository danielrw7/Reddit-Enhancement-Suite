/* @flow */

import _ from 'lodash';
import { Case } from '../Case';
import { numericalCompare, prettyOperator, inverseOperator } from '../../../utils';

const qualifiers = [['Y', 12], ['M', 30.44], ['d', 24], ['h', 60], ['m', 60], ['s', 1000]];

function prettifyAge(remainder) {
	let remainderQualifier = '';
	for (const [qualifier, multiplier] of qualifiers.slice().reverse()) {
		if (remainder < multiplier) break;
		remainder /= multiplier;
		remainderQualifier = qualifier;
	}

	return remainder.toFixed(2) + remainderQualifier;
}

export class CommentRelativeAge extends Case {
	static text = 'Comment age relative to post';

	static parseCriterion(input: *) {
		let age = parseInt(input, 10);
		if (isNaN(age)) throw new Error('Invalid age');

		const ageQualifier = _.head(input.match(/Y|M|d|h|m|s/)) || 's';
		age = _.dropWhile(qualifiers, ([qualifier]) => qualifier !== ageQualifier)
			.reduce((a, [, multiplier]) => a * multiplier, age);

		return { op: '<=', age };
	}

	static postTimestamp(thing: *) {
		return thing.getCommentPost().getTimestamp();
	}

	static thingToCriterion(thing: *) {
		const remainder = (thing.getTimestamp() - CommentRelativeAge.postTimestamp(thing));
		if (isNaN(remainder)) throw new Error('Could not determine Thing date');
		return prettifyAge(remainder);
	}

	static defaultConditions = { op: '<=', age: 4 * 60 * 60 * 1000 };
	static fields = ['comment is ', { type: 'select', options: 'COMPARISON', id: 'op' }, ' ', { type: 'duration', id: 'age' }, ' older than the post'];

	static pattern = 'x[(Y|M|d|h|m)] — where x is the number of seconds or Y year, M month, h hour, m minute (case sensitive)';

	trueText = `age ${prettyOperator(this.conditions.op)} ${prettifyAge(this.conditions.age)}`;
	falseText = `age ${prettyOperator(inverseOperator(this.conditions.op))} ${prettifyAge(this.conditions.age)}`;

	evaluate(thing: *) {
		const commentTime = thing.getTimestamp();
		if (!commentTime) return null;
		return numericalCompare(this.value.op, commentTime - CommentRelativeAge.postTimestamp(thing), this.value.age);
	}
}
