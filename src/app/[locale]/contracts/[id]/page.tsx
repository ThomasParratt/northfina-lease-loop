// A signed contract: the summary with the frozen price and, when today's price list is another
// version, why the price holds (card 2), then the invoices with the VAT-change line (card 3).
// Only the contract's customer or admin sees it (D17).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { ContractSummary } from '@/components/contract-summary';
import { ExitForm } from '@/components/exit-form';
import { InvoiceTable } from '@/components/invoice-table';
import { Card, Notice, PageHeader } from '@/components/ui';
import { getT } from '@/i18n/get-t';
import { isLocale } from '@/i18n/locales';
import { ADMIN_ACTOR, readActor } from '@/server/actor';
import { getAsset } from '@/server/assets';
import { getContractDetails } from '@/server/contracts';
import { listCustomers } from '@/server/customers';
import { db } from '@/server/db';
import { todayForRequest } from '@/server/demo-clock';
import { previewExit } from '@/server/exits';
import { assetConditionSchema } from '@/data/schemas';
import { formatIsoDate } from '@/i18n/format';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/contracts/[id]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getT(locale);
  return { title: t('meta.pageTitle', { page: t('contract.title') }) };
}

export default async function ContractPage({ params }: PageProps<'/[locale]/contracts/[id]'>) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  await connection();
  const t = getT(locale);
  const today = await todayForRequest();

  const [details, actor] = await Promise.all([getContractDetails(db, id, today), readActor(db)]);
  const allowed = details && (actor === ADMIN_ACTOR || actor === details.contract.customerId);
  if (!details || !allowed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <PageHeader title={t('contract.title')} />
        <Notice tone="warning">{t(details ? 'contract.notAllowed' : 'contract.notFound')}</Notice>
      </div>
    );
  }
  const asset = await getAsset(db, details.contract.assetId);

  // The exit section (docs/features/exits.md): the plan for an active contract, previewed on
  // today with the catalogue's last known condition and usage; the end day once it has ended.
  const { contract } = details;
  const exitPreview =
    contract.status === 'active' && asset
      ? await previewExit(db, { contractId: contract.id, mode: 'return', reported: asset }, today)
      : null;
  const nextCustomers = exitPreview?.ok
    ? (await listCustomers(db))
        .filter((customer) => customer.id !== contract.customerId)
        .map((customer) => ({ id: customer.id, name: customer.name }))
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        title={t('contract.title')}
        intro={t('contract.number', { number: details.contract.number })}
      />
      <ContractSummary details={details} asset={asset} locale={locale} t={t} />
      {asset && exitPreview?.ok ? (
        <Card title={t('exit.title')}>
          <ExitForm
            contractId={contract.id}
            locale={locale}
            endDate={contract.endDate}
            conditions={assetConditionSchema.options}
            usageUnit={asset.usage.unit}
            initial={{ condition: asset.condition, usageValue: asset.usage.value }}
            initialPreview={exitPreview.preview}
            customers={nextCustomers}
          />
        </Card>
      ) : null}
      {contract.endedOn ? (
        <Notice tone="info" title={t('exit.ended.title')}>
          {t('exit.ended.body', {
            status: t(`contract.status.${contract.status}`),
            date: formatIsoDate(contract.endedOn, locale),
          })}
        </Notice>
      ) : null}
      <Card title={t('invoice.title')}>
        <InvoiceTable contractId={details.contract.id} today={today} locale={locale} t={t} />
      </Card>
    </div>
  );
}
