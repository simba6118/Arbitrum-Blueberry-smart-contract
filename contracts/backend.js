const ObjectId = require('mongoose').Types.ObjectId

const Contest = require('../models/Contest')
const User = require('../models/User')
const Entry = require('../models/Entry')
const Question = require('../models/Question')
const Answer = require('../models/Answer')
const Team = require('../models/Team')
const Player = require('../models/Player')
const Payout = require('../models/Payout')
const ABI = require('../abi.json')

//simba
const ethers = require('ethers')
const contract = '0x9f9F549B8aF4c87C8DB6D7B8F1B477e60B73Ab15'
const provider = new ethers.providers.JsonRpcProvider(
  'https://base-sepolia.g.alchemy.com/v2/BwhL1niYjaBgDgIZRaajKvphNFQCLlvx'
)
const privateKey = 'your-private-key';
const signer = new ethers.Wallet(privateKey, provider);
const smartContract = new ethers.Contract(contract, ABI, signer);

const {
  getTotalPrizePool,
  getPrizePoolPercents,
  getPaidPlaces,
  getPrizePools,
} = require('../utils/calculation')

//simba
const distribute = async () => {
  const distributions = [
    {
      receiver: '0x6d76B65Cb34d9240876D7ec51Cd0219676Dd7FE5',
      amount: '200000000000',
    },
    {
      receiver: '0xDA24FC208f87078366dcF4837EAdC606E157D100',
      amount: '500000000000',
    },
  ]
  try {
      const txResponse = await smartContract.distributeToken(distributions);
      const receipt = await txResponse.wait();
      console.log('Transaction successful:', receipt);
  } catch (error) {
      console.error('Failed to send transaction:', error);
  }
}

const getContests = async (req, res) => {
  const {
    sport,
    entryFees,
    contestTypes,
    payouts: payoutTypes,
    status,
    trending,
  } = req.query

  let filter = {}

  if (sport) {
    filter.sport = sport
  }

  if (entryFees) {
    filter.entryFee = { $in: entryFees }
  }

  if (contestTypes) {
    filter.type = { $in: contestTypes }
  }

  if (trending) {
    filter.trending = true
  }

  if (payoutTypes) {
    const payouts = await Payout.find({ type: { $in: payoutTypes } })
    const payoutIds = payouts.map((item) => {
      const { _id } = item.toJSON()
      return _id
    })
    filter.payout = { $in: payoutIds }
  }

  if (status) {
    filter.status = status
  }

  const contests = await Contest.find(filter).populate('league payout')

  const newContests = contests.map((item) => {
    const newItem = item.toJSON()

    newItem.paidPlaces = getPaidPlaces(
      newItem.payout.tables,
      newItem.entryCount
    )
    newItem.prizePool = getTotalPrizePool(newItem.entryFee, newItem.entryCount)

    return newItem
  })

  return res.json(newContests)
}

const getTopContestsByEntryFees = async (limit) => {
  let contests = await Contest.aggregate([
    {
      $addFields: {
        value: { $multiply: ['$entryFee', { $size: '$entries' }] },
      },
    },
    {
      $sort: { value: -1 },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        title: 1,
        value: 1,
      },
    },
  ])

  if (contests.length > 0) {
    const maxValue = contests[0].value

    contests = contests.map((contest) => ({
      ...contest,
      progress: (contest.value / maxValue) * 100,
    }))
  }

  return contests
}

const getTopContestsByUsers = async (limit) => {
  let contests = await Contest.aggregate([
    {
      $addFields: {
        value: { $size: '$entries' },
      },
    },
    {
      $sort: { value: -1 },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        title: 1,
        value: 1,
      },
    },
  ])

  if (contests.length > 0) {
    const maxValue = contests[0].value

    contests = contests.map((contest) => ({
      ...contest,
      progress: (contest.value / maxValue) * 100,
    }))
  }
  return contests
}

const getTopContests = async (req, res) => {
  const limit = 5

  const contests = {
    entryFees: await getTopContestsByEntryFees(limit),
    users: await getTopContestsByUsers(limit),
  }

  return res.json(contests)
}

const getContest = async (req, res) => {
  const id = req.params.id

  const contest = await Contest.findById(id).populate({
    path: 'questions',
    populate: {
      path: 'answers',
    },
  })

  return res.json(contest)
}

const getUserEntryByContestId = async (walletAddress, id) => {
  const entry = await User.aggregate([
    {
      $match: {
        walletAddress,
      },
    },
    {
      $lookup: {
        from: 'entries',
        localField: 'entries',
        foreignField: '_id',
        as: 'entries',
      },
    },
    {
      $unwind: '$entries',
    },
    {
      $match: {
        'entries.contest': new ObjectId(id),
      },
    },
    {
      $unwind: '$entries.answers',
    },
    {
      $lookup: {
        from: 'answers',
        localField: 'entries.answers.answer',
        foreignField: '_id',
        as: 'entries.answers.answer',
      },
    },
    {
      $addFields: {
        'entries.answers.answer': {
          $arrayElemAt: ['$entries.answers.answer', 0],
        },
      },
    },
    {
      $group: {
        _id: '$entries._id',
        answers: {
          $push: '$entries.answers',
        },
        totalPoints: {
          $sum: {
            $cond: {
              if: '$entries.answers.answer.isRight',
              then: '$entries.answers.answer.points',
              else: 0,
            },
          },
        },
      },
    },
    {
      $sort: {
        totalPoints: -1,
      },
    },
  ])

  return entry
}

const getContestAndEntry = async (req, res) => {
  const id = req.params.id
  const { walletAddress } = req.query

  const contest = await Contest.findById(id)
    .populate('payout')
    .populate({
      path: 'questions',
      populate: {
        path: 'player',
        populate: {
          path: 'team',
          select: 'nickname',
        },
      },
    })
    .populate({
      path: 'questions',
      populate: {
        path: 'opponentTeam',
        select: 'nickname',
      },
    })
    .populate({
      path: 'questions',
      populate: {
        path: 'answers',
        populate: {
          path: 'team',
        },
      },
    })
    .populate({
      path: 'questions',
      populate: {
        path: 'answers',
        populate: {
          path: 'player',
          populate: {
            path: 'team',
            select: 'nickname',
          },
        },
      },
    })
    .populate({
      path: 'questions',
      populate: {
        path: 'answers',
        populate: {
          path: 'opponentTeam',
          select: 'nickname',
        },
      },
    })

  if (contest) {
    const newContest = contest.toJSON()

    newContest.paidPlaces = getPaidPlaces(
      newContest.payout.tables,
      newContest.entryCount
    )

    const entries = await getEntriesByContestId(id)

    const entry = entries.find((item) => item.walletAddress === walletAddress)

    if (entry) {
      const totalPrizePool = getTotalPrizePool(
        newContest.entryFee,
        newContest.entryCount
      )
      const winningsPercents = getPrizePoolPercents(
        newContest.payout.tables,
        newContest.entryCount
      )

      const index = entries.indexOf(entry)
      entry.rank = index + 1

      if (newContest.status !== 'complete') {
        entry.winnings = 0
      } else {
        entry.winnings = (totalPrizePool * winningsPercents[index]) / 100
      }

      return res.json({ ...newContest, entry })
    }

    return res.json(newContest)
  }

  return res.status(404).json({ error: 'Contest not found.' })
}

const getEntriesByContestId = async (id) => {
  const entries = await Entry.aggregate([
    { $match: { contest: new ObjectId(id) } },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $addFields: {
        user: {
          $arrayElemAt: ['$user', 0],
        },
      },
    },
    { $unwind: '$answers' },
    {
      $lookup: {
        from: 'answers',
        localField: 'answers.answer',
        foreignField: '_id',
        as: 'answers.answer',
      },
    },
    {
      $addFields: {
        'answers.answer': {
          $arrayElemAt: ['$answers.answer', 0],
        },
      },
    },
    {
      $group: {
        _id: '$_id',
        walletAddress: {
          $first: '$user.walletAddress',
        },
        answers: {
          $push: '$answers',
        },
        totalPoints: {
          $sum: {
            $cond: {
              if: '$answers.answer.isRight',
              then: '$answers.answer.points',
              else: 0,
            },
          },
        },
      },
    },
    {
      $sort: {
        totalPoints: -1,
      },
    },
  ])

  return entries
}

const getContestAndEntries = async (req, res) => {
  const id = req.params.id

  let contest = await Contest.findById(id)
    .populate('payout')
    .populate({
      path: 'questions',
      populate: {
        path: 'player',
        populate: {
          path: 'team',
          select: 'nickname',
        },
      },
    })
    .populate({
      path: 'questions',
      populate: {
        path: 'opponentTeam',
        select: 'nickname',
      },
    })
    .populate({
      path: 'questions',
      populate: {
        path: 'answers',
        populate: {
          path: 'team',
        },
      },
    })
    .populate({
      path: 'questions',
      populate: {
        path: 'answers',
        populate: {
          path: 'player',
          populate: {
            path: 'team',
            select: 'nickname',
          },
        },
      },
    })
    .populate({
      path: 'questions',
      populate: {
        path: 'answers',
        populate: {
          path: 'opponentTeam',
          select: 'nickname',
        },
      },
    })

  if (contest) {
    const newContest = contest.toJSON()

    const totalPrizePool = getTotalPrizePool(
      newContest.entryFee,
      newContest.entryCount
    )
    const prizePoolPercents = getPrizePoolPercents(
      newContest.payout.tables,
      newContest.entryCount
    )

    const entries = await getEntriesByContestId(id)

    const newEntries = entries.map((item, index) => {
      item.rank = index + 1
      if (contest.status !== 'complete') {
        item.winnings = 0
      } else {
        item.winnings = (totalPrizePool * prizePoolPercents[index]) / 100
      }

      return item
    })

    return res.json({ ...newContest, entries: newEntries })
  }

  return res.status(404).json({ error: 'Contest not found.' })
}

const getContestPaytable = async (req, res) => {
  const id = req.params.id

  const contest = await Contest.findById(id)

  if (contest) {
    const { entryFee, payout: payoutId, entryCount } = contest.toJSON()

    const totalPrizePool = getTotalPrizePool(entryFee, entryCount)
    const payout = await Payout.findById(payoutId)
    const { tables } = payout.toJSON()
    const prizePoolPercents = getPrizePoolPercents(tables, entryCount)
    const prizePools = getPrizePools(totalPrizePool, prizePoolPercents)

    return res.json({ entryCount, totalPrizePool, prizePools })
  }

  return res.status(404).json({ error: 'Contest not found.' })
}

const createContest = async (req, res) => {
  let { questions, entryFees, ...rest } = req.body
  const file = req.file

  const url = `${req.protocol}://${req.get('host')}/`
  if (file) {
    rest.background = url + file.path
  }

  questions = JSON.parse(questions)
  entryFees = entryFees.split(',')

  for (const entryFee of entryFees) {
    let contestId
    const count = await Contest.countDocuments({ type: rest.type })
    switch (rest.type) {
      case 'pickem':
        contestId = 1000001 + count
        break
      case 'playem':
        contestId = 2000001 + count
        break
      case 'fantasyTiers':
        contestId = 3000001 + count
        break
    }

    const questionIds = []
    for (const item of questions) {
      const { answers, ...rest } = item
      const answerIds = []
      for (const item of answers) {
        const answer = new Answer(item)
        await answer.save()
        answerIds.push(answer._id)
      }
      const question = new Question({ ...rest, answers: answerIds })
      await question.save()
      questionIds.push(question._id)
    }

    const contest = new Contest({
      ...rest,
      contestId,
      entryFee,
      questions: questionIds,
    })
    await contest.save()
  }

  return res.status(201).json({ message: 'Contest(s) created.' })
}

const updateContest = async (req, res) => {
  const id = req.params.id
  let { questions, ...rest } = req.body
  const file = req.file

  const url = `${req.protocol}://${req.get('host')}/`
  if (file) {
    rest.background = url + file.path
  }

  questions = JSON.parse(questions)
  const questionIds = []
  for (const item of questions) {
    const { answers, ...rest } = item
    if (item?._id) {
      const answerIds = []
      for (const item of answers) {
        if (item?._id) {
          await Answer.findByIdAndUpdate(item._id, item)
          answerIds.push(item._id)
        } else {
          const answer = new Answer(item)
          await answer.save()
          answerIds.push(answer._id)
        }
      }
      await Question.findByIdAndUpdate(item._id, {
        ...rest,
        answers: answerIds,
      })
      questionIds.push(item._id)
    } else {
      const answerIds = []
      for (const item of answers) {
        const answer = new Answer(item)
        await answer.save()
        answerIds.push(answer._id)
      }
      const question = new Question({ ...rest, answers: answerIds })
      await question.save()
      questionIds.push(question._id.toString())
    }
  }

  const oldContest = await Contest.findByIdAndUpdate(
    id,
    { ...rest, questions: questionIds },
    { new: false }
  )

  for (const item of oldContest.questions) {
    if (!questionIds.includes(item.toString())) {
      const question = await Question.findByIdAndDelete(item)
      await Answer.deleteMany({ _id: { $in: question.answers } })
    }
  }

  await distribute()

  return res.status(204).json({ message: 'Contest updated.' })
}

const deleteContest = async (req, res) => {
  const id = req.params.id

  const contest = await Contest.findByIdAndDelete(id)

  for (const questionId of contest.questions) {
    const question = await Question.findByIdAndDelete(questionId)

    await Answer.deleteMany({ _id: { $in: question.answers } })
  }

  return res.status(204).json({ message: 'Contest deleted.' })
}

module.exports = {
  getContests,
  getTopContests,
  getContest,
  getContestAndEntry,
  getContestAndEntries,
  getContestPaytable,
  createContest,
  updateContest,
  deleteContest,
  getEntriesByContestId,
}
