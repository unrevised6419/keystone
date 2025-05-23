import { g } from './schema'
import {
  type BaseItem,
  type CreateFieldInputArg,
  type DatabaseProvider,
  type FieldTypeWithoutDBField,
  type JSONValue,
  type KeystoneContext,
  type ScalarDBField,
  type UpdateFieldInputArg,
  fieldType,
} from '.'
import type {
  GArg,
  GField,
  GInputType,
  GNullableInputType,
  InferValueFromArg,
} from '@graphql-ts/schema'

function mapOutputFieldToSQLite(
  field: GField<
    { value: JSONValue; item: BaseItem },
    Record<string, GArg<GInputType>>,
    any,
    JSONValue,
    KeystoneContext
  >
) {
  const innerResolver = field.resolve || (({ value }) => value)
  return g.field({
    type: field.type,
    args: field.args,
    deprecationReason: field.deprecationReason,
    description: field.description,
    extensions: field.extensions as any,
    resolve(
      source: {
        value: string | null
        item: BaseItem
      },
      ...extra
    ) {
      if (source.value === null) {
        return innerResolver(source, ...extra)
      }
      let value: JSONValue = null
      try {
        value = JSON.parse(source.value)
      } catch (err) {}
      return innerResolver({ item: source.item, value }, ...extra)
    },
  })
}

function mapUpdateInputArgToSQLite<Arg extends GArg<GInputType, any>>(
  arg: UpdateFieldInputArg<ScalarDBField<'Json', 'optional'>, Arg> | undefined
): UpdateFieldInputArg<ScalarDBField<'String', 'optional'>, Arg> | undefined {
  if (arg === undefined) {
    return undefined
  }
  return {
    arg: arg.arg,
    async resolve(
      input: InferValueFromArg<Arg>,
      context: KeystoneContext,
      relationshipInputResolver: any
    ) {
      const resolvedInput =
        arg.resolve === undefined
          ? input
          : await arg.resolve(input, context, relationshipInputResolver)
      if (resolvedInput === undefined || resolvedInput === null) {
        return resolvedInput
      }
      return JSON.stringify(resolvedInput)
    },
  } as any
}

function mapCreateInputArgToSQLite<Arg extends GArg<GInputType, any>>(
  arg: CreateFieldInputArg<ScalarDBField<'Json', 'optional'>, Arg> | undefined
): CreateFieldInputArg<ScalarDBField<'String', 'optional'>, Arg> | undefined {
  if (arg === undefined) {
    return undefined
  }
  return {
    arg: arg.arg,
    async resolve(
      input: InferValueFromArg<Arg>,
      context: KeystoneContext,
      relationshipInputResolver: any
    ) {
      const resolvedInput =
        arg.resolve === undefined
          ? input
          : await arg.resolve(input as any, context, relationshipInputResolver)
      if (resolvedInput === undefined || resolvedInput === null) {
        return resolvedInput
      }
      return JSON.stringify(resolvedInput)
    },
  } as any
}

export function jsonFieldTypePolyfilledForSQLite<
  CreateArg extends GArg<GInputType, any>,
  UpdateArg extends GArg<GInputType, any>,
>(
  provider: DatabaseProvider,
  config: FieldTypeWithoutDBField<
    ScalarDBField<'Json', 'optional'>,
    CreateArg,
    UpdateArg,
    GArg<GNullableInputType, false>,
    GArg<GNullableInputType, false>
  > & {
    input?: {
      uniqueWhere?: undefined
      orderBy?: undefined
    }
  },
  dbFieldConfig?: {
    map?: string
    mode?: 'required' | 'optional'
    default?: ScalarDBField<'Json', 'optional'>['default']
    extendPrismaSchema?: (field: string) => string
  }
) {
  if (provider === 'sqlite') {
    return fieldType({
      kind: 'scalar',
      mode: dbFieldConfig?.mode ?? 'optional',
      scalar: 'String',
      default: dbFieldConfig?.default,
      map: dbFieldConfig?.map,
      extendPrismaSchema: dbFieldConfig?.extendPrismaSchema,
    })({
      ...config,
      input: {
        create: mapCreateInputArgToSQLite(config.input?.create) as any,
        update: mapUpdateInputArgToSQLite(config.input?.update),
      },
      output: mapOutputFieldToSQLite(config.output),
      extraOutputFields: Object.fromEntries(
        Object.entries(config.extraOutputFields || {}).map(([key, field]) => [
          key,
          mapOutputFieldToSQLite(field),
        ])
      ),
    })
  }
  return fieldType({
    kind: 'scalar',
    mode: (dbFieldConfig?.mode ?? 'optional') as 'optional',
    scalar: 'Json',
    default: dbFieldConfig?.default,
    map: dbFieldConfig?.map,
    extendPrismaSchema: dbFieldConfig?.extendPrismaSchema,
  })(config)
}
